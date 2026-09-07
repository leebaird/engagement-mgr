import assert from 'node:assert/strict';
import { access, chmod, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { pool, prisma } from './db';

import {
  assertScreenshotQuota,
  ensureReconciledScreenshotStorage,
  finishStagedScreenshotDeletion,
  getScreenshotStorageUsage,
  MAX_SCREENSHOTS_PER_FINDING,
  MAX_SCREENSHOT_STORAGE_BYTES,
  reconcileScreenshotFiles,
  reconcileScreenshotStorage,
  restoreStagedScreenshotDeletion,
  ScreenshotQuotaError,
  stageScreenshotDeletion,
  withUploadsMaintenanceLock,
} from './screenshot-storage';

describe('screenshot storage quotas', () => {
  it('backs off failed dashboard reconciliation, coalesces retries, and clears failure after repair', async (t) => {
    const failure = new Error('storage unavailable');
    let attempts = 0;
    let now = Date.now();
    t.mock.method(Date, 'now', () => now);
    t.mock.method(pool, 'connect', async () => {
      attempts++;
      throw failure;
    });
    const findMany = prisma.screenshot.findMany;
    prisma.screenshot.findMany = (async () => []) as unknown as typeof findMany;
    t.after(() => { prisma.screenshot.findMany = findMany; });

    await Promise.all([
      assert.rejects(ensureReconciledScreenshotStorage(), (error) => error === failure),
      assert.rejects(ensureReconciledScreenshotStorage(), (error) => error === failure),
    ]);
    assert.equal(attempts, 1);
    now += 59_999;
    await assert.rejects(ensureReconciledScreenshotStorage(), (error) => error === failure);
    assert.equal(attempts, 1);
    now += 1;
    await Promise.all([
      assert.rejects(ensureReconciledScreenshotStorage(), (error) => error === failure),
      assert.rejects(ensureReconciledScreenshotStorage(), (error) => error === failure),
    ]);
    assert.equal(attempts, 2);

    const directory = await mkdtemp(join(tmpdir(), 'em-reconciliation-retry-'));
    try {
      await reconcileScreenshotStorage(directory);
      await ensureReconciledScreenshotStorage();
      assert.equal(attempts, 2);
      const path = join(directory, '11111111-1111-4111-8111-111111111111.png');
      await writeFile(path, 'evidence');
      await stageScreenshotDeletion(path);
      await assert.rejects(ensureReconciledScreenshotStorage(), (error) => error === failure);
      assert.equal(attempts, 3);
      await reconcileScreenshotStorage(directory);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('holds the shared session lock across upload and maintenance operations', async () => {
    const calls: unknown[][] = [];
    let released = false;
    const databasePool = {
      connect: async () => ({
        query: async (...args: unknown[]) => {
          calls.push(args);
          return { rows: [{ locked: true }] };
        },
        release: () => {
          released = true;
        },
      }),
    };

    const result = await withUploadsMaintenanceLock(
      async () => {
        calls.push(['operation']);
        return 'completed';
      },
      databasePool
    );
    assert.equal(result, 'completed');
    assert.equal(released, true);
    assert.deepEqual(calls, [
      ['SELECT pg_try_advisory_lock($1::integer) AS locked', [1_394_517_092]],
      ['operation'],
      ['SELECT pg_advisory_unlock($1::integer)', [1_394_517_092]],
    ]);
  });

  it('fails fast when database maintenance already holds the lock', async () => {
    let operationCalled = false;
    let released = false;
    const databasePool = {
      connect: async () => ({
        query: async () => ({ rows: [{ locked: false }] }),
        release: () => {
          released = true;
        },
      }),
    };

    await assert.rejects(
      () =>
        withUploadsMaintenanceLock(async () => {
          operationCalled = true;
        }, databasePool),
      /temporarily unavailable/
    );
    assert.equal(operationCalled, false);
    assert.equal(released, true);
  });

  it('accepts an upload below the global and per-finding limits', () => {
    assert.doesNotThrow(() =>
      assertScreenshotQuota({ storedBytes: 10, storedFiles: 1, findingFiles: 1, uploadBytes: 10 })
    );
  });

  it('rejects byte and per-finding quota overflows', () => {
    assert.throws(
      () =>
        assertScreenshotQuota({
          storedBytes: MAX_SCREENSHOT_STORAGE_BYTES,
          storedFiles: 1,
          findingFiles: 1,
          uploadBytes: 1,
        }),
      ScreenshotQuotaError
    );
    assert.throws(
      () =>
        assertScreenshotQuota({
          storedBytes: 0,
          storedFiles: MAX_SCREENSHOTS_PER_FINDING,
          findingFiles: MAX_SCREENSHOTS_PER_FINDING,
          uploadBytes: 1,
        }),
      ScreenshotQuotaError
    );
  });

  it('counts stored files and bytes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'em-screenshot-storage-'));
    try {
      await writeFile(join(directory, 'existing.png'), Buffer.alloc(20));
      assert.deepEqual(await getScreenshotStorageUsage(directory), {
        storedBytes: 20,
        storedFiles: 1,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('reconciles interrupted deletes and removes unreferenced upload artifacts', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'em-screenshot-reconcile-'));
    const referenced = '11111111-1111-4111-8111-111111111111.png';
    const interrupted = '22222222-2222-4222-8222-222222222222.jpg';
    const orphan = '33333333-3333-4333-8333-333333333333.png';
    try {
      await writeFile(join(directory, referenced), 'referenced');
      await writeFile(join(directory, `.pending-delete-${interrupted}`), 'interrupted');
      await writeFile(join(directory, orphan), 'orphan');
      await writeFile(join(directory, `.${orphan}.tmp`), 'temporary');

      await reconcileScreenshotFiles(directory, new Set([referenced, interrupted]));

      assert.deepEqual((await readdir(directory)).sort(), [interrupted, referenced].sort());
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('stages deletions so they can be restored or completed after a database outcome', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'em-screenshot-delete-'));
    const filePath = join(directory, '44444444-4444-4444-8444-444444444444.png');
    try {
      await writeFile(filePath, 'evidence');
      const restored = await stageScreenshotDeletion(filePath);
      assert.ok(restored);
      await restoreStagedScreenshotDeletion(restored);
      await access(filePath);

      const completed = await stageScreenshotDeletion(filePath);
      assert.ok(completed);
      await finishStagedScreenshotDeletion(completed);
      await assert.rejects(() => access(filePath), { code: 'ENOENT' });
      await assert.rejects(() => access(completed.stagedPath), { code: 'ENOENT' });

      await writeFile(filePath, 'evidence');
      const interrupted = await stageScreenshotDeletion(filePath);
      assert.ok(interrupted);
      await chmod(directory, 0o500);
      await assert.rejects(() => finishStagedScreenshotDeletion(interrupted));
      await chmod(directory, 0o700);
      await reconcileScreenshotFiles(directory, new Set());
      await assert.rejects(() => access(interrupted.stagedPath), { code: 'ENOENT' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
