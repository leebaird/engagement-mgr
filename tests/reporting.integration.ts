import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { changeFinding } from '../src/lib/finding-workflow';
import {
  assertReportBlueprintUnchanged,
  collectEngagementReport,
  renderEngagementReport,
} from '../src/lib/report-service';
import {
  UPLOADS_MAINTENANCE_LOCK_ID,
  UploadsLockBusyError,
  withUploadsMaintenanceLock,
} from '../src/lib/screenshot-storage';
import { testSetting } from './test-env';

const url = testSetting('REPORTING_TEST_DATABASE_URL');
if (
  !url ||
  !['localhost', '127.0.0.1'].includes(new URL(url).hostname) ||
  new URL(url).pathname !== '/reporting_tests'
)
  throw new Error(
    'Set REPORTING_TEST_DATABASE_URL to an isolated local database named reporting_tests. Never use the application database.'
  );
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
let clientId: string, engagementId: string, findingId: string, userId: string;

describe('reporting database transactions', () => {
  before(async () => {
    const user = await db.user.create({
      data: {
        username: `report-test-${crypto.randomUUID()}`,
        passwordHash: 'unused-test-only',
        role: 'User',
      },
    });
    userId = user.id;
    const client = await db.client.create({
      data: { company: 'Isolated reporting fixture' },
    });
    clientId = client.id;
    const engagement = await db.engagement.create({
      data: {
        codeName: 'Reporting fixture',
        clientId,
        targets: 'example.test',
      },
    });
    engagementId = engagement.id;
    const finding = await db.finding.create({
      data: {
        title: 'Initial finding',
        severity: 'High',
        remediation: 'Apply fix',
        engagementId,
        authorId: userId,
        engagementContext: {
          create: {
            engagementId,
            observation: 'Observed result',
            affectedHosts: 'example.test',
          },
        },
      },
    });
    findingId = finding.id;
  });
  after(async () => {
    if (findingId) await db.finding.deleteMany({ where: { id: findingId } });
    if (engagementId)
      await db.engagement.deleteMany({ where: { id: engagementId } });
    if (clientId) await db.client.deleteMany({ where: { id: clientId } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });
  it('allows exactly one concurrent edit and retains both text versions', async () => {
    const results = await Promise.allSettled(
      ['First writer', 'Second writer'].map((title) =>
        db.$transaction((tx) =>
          changeFinding(tx, findingId, 1, userId, 'Edit', async () => {
            await tx.finding.update({
              where: { id: findingId },
              data: { title },
            });
          })
        )
      )
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
    const revisions = await db.findingRevision.findMany({
      where: { findingId },
      orderBy: { version: 'asc' },
    });
    assert.deepEqual(
      revisions.map((r) => r.version),
      [1, 2]
    );
    assert.equal(
      (revisions[0].content as { title: string }).title,
      'Initial finding'
    );
  });
  it('rolls back the version, content and approval when a mutation fails', async () => {
    await db.finding.update({
      where: { id: findingId },
      data: { reviewStatus: 'Approved' },
    });
    await assert.rejects(
      db.$transaction((tx) =>
        changeFinding(tx, findingId, 2, userId, 'Failed edit', async () => {
          await tx.finding.update({
            where: { id: findingId },
            data: { title: 'Must roll back' },
          });
          throw new Error('Injected commit-path failure');
        })
      )
    );
    const finding = await db.finding.findUniqueOrThrow({
      where: { id: findingId },
    });
    assert.equal(finding.version, 2);
    assert.equal(finding.reviewStatus, 'Approved');
    assert.notEqual(finding.title, 'Must roll back');
    assert.equal(await db.findingRevision.count({ where: { findingId } }), 2);
  });
  it('issues from approved content and leaves the stored PDF unchanged after later edits', async () => {
    await db.engagementReport.create({
      data: {
        engagementId,
        title: 'Assessment',
        executiveSummary: 'Executive summary',
        findingIds: [findingId],
      },
    });
    const rendered = await db.$transaction((tx) =>
      renderEngagementReport(tx, engagementId, true)
    );
    const issued = await db.issuedReport.create({
      data: {
        engagementId,
        version: 1,
        issuedBy: userId,
        ...rendered,
        pdf: new Uint8Array(rendered.pdf),
      },
    });
    await db.$transaction((tx) =>
      changeFinding(tx, findingId, 2, userId, 'New evidence', async () => {
        await tx.finding.update({
          where: { id: findingId },
          data: { background: 'Changed after issue' },
        });
      })
    );
    assert.equal(
      (await db.finding.findUniqueOrThrow({ where: { id: findingId } }))
        .reviewStatus,
      'Draft'
    );
    const stored = await db.issuedReport.findUniqueOrThrow({
      where: { id: issued.id },
    });
    assert.deepEqual(stored.pdf, issued.pdf);
    assert.equal(stored.sha256, issued.sha256);
    await assert.rejects(
      db.$transaction((tx) => renderEngagementReport(tx, engagementId, true)),
      /approved/
    );
    assert.equal(
      (
        await db.$transaction((tx) =>
          renderEngagementReport(tx, engagementId, false)
        )
      ).pdf
        .subarray(0, 5)
        .toString(),
      '%PDF-'
    );
  });
  it('rejects issuance when approved content changes after blueprint collection', async () => {
    await db.engagementReport.update({
      where: { engagementId },
      data: { findingIds: [findingId] },
    });
    await db.finding.update({
      where: { id: findingId },
      data: { reviewStatus: 'Approved' },
    });
    const blueprint = await db.$transaction((tx) =>
      collectEngagementReport(tx, engagementId, true)
    );
    await db.finding.update({
      where: { id: findingId },
      data: { background: 'Changed during issuance', version: { increment: 1 } },
    });
    const issuedBefore = await db.issuedReport.count({ where: { engagementId } });

    await assert.rejects(
      db.$transaction(async (tx) => {
        assertReportBlueprintUnchanged(
          blueprint,
          await collectEngagementReport(tx, engagementId, true)
        );
        await tx.issuedReport.create({
          data: {
            engagementId,
            version: issuedBefore + 1,
            issuedBy: userId,
            title: blueprint.title,
            snapshot: {},
            pdf: new Uint8Array([1]),
            sha256: 'not-reached',
          },
        });
      }),
      /changed while the report was being issued/
    );
    assert.equal(
      await db.issuedReport.count({ where: { engagementId } }),
      issuedBefore
    );
  });
  it('rejects a report selection containing a finding from another engagement', async () => {
    await db.engagementReport.update({
      where: { engagementId },
      data: { findingIds: [crypto.randomUUID()] },
    });
    await assert.rejects(
      db.$transaction((tx) => renderEngagementReport(tx, engagementId, false)),
      /removed or moved/
    );
  });
});

describe('uploads maintenance lock on PostgreSQL', () => {
  // The holder takes the advisory lock on its own connection, standing in for another
  // process such as the offline restore; the app's in-process queue does not see it.
  const pools: Pool[] = [];
  const newPool = (max = 3) => {
    const pool = new Pool({ connectionString: url, max });
    pools.push(pool);
    return pool;
  };
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  async function holdLockElsewhere() {
    const client = await newPool(1).connect();
    await client.query('SELECT pg_advisory_lock($1::integer)', [UPLOADS_MAINTENANCE_LOCK_ID]);
    return async () => {
      await client.query('SELECT pg_advisory_unlock($1::integer)', [UPLOADS_MAINTENANCE_LOCK_ID]);
      client.release();
    };
  }
  after(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  it('waits for another process to release the lock and then runs', async () => {
    const release = await holdLockElsewhere();
    const order: string[] = [];
    const waiter = withUploadsMaintenanceLock(
      async () => {
        order.push('waiter');
      },
      newPool(),
      { waitMs: 5_000 }
    );
    await sleep(300);
    assert.equal(order.length, 0);
    order.push('holder released');
    await release();
    await waiter;
    assert.deepEqual(order, ['holder released', 'waiter']);
  });

  it('gives up with UploadsLockBusyError once the wait window passes', async () => {
    const release = await holdLockElsewhere();
    try {
      let ran = false;
      await assert.rejects(
        withUploadsMaintenanceLock(
          async () => {
            ran = true;
          },
          newPool(),
          { waitMs: 300 }
        ),
        UploadsLockBusyError
      );
      assert.equal(ran, false);
    } finally {
      await release();
    }
  });

  it('keeps the pool usable for other queries while waiting', async () => {
    const release = await holdLockElsewhere();
    const pool = newPool(1);
    const waiter = withUploadsMaintenanceLock(async () => {}, pool, { waitMs: 10_000 });
    await sleep(150);
    // The waiter shares this one-connection pool; app queries must still get through.
    const { rows } = await pool.query<{ value: number }>('SELECT 1 AS value');
    assert.equal(rows[0].value, 1);
    await release();
    await waiter;
  });
});
