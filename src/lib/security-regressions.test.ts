import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

async function repositoryFile(path: string): Promise<string> {
  return readFile(join(process.cwd(), path), 'utf8');
}

describe('security boundary regressions', () => {
  it('keeps backup grants out of URLs', async () => {
    const action = await repositoryFile('src/app/actions/db.ts');
    const page = await repositoryFile('src/app/dashboard/users/page.tsx');
    const route = await repositoryFile('src/app/api/db/backup/route.ts');
    assert.equal(action.includes('backupToken'), false);
    assert.equal(page.includes('backupToken'), false);
    assert.equal(route.includes("searchParams.get('token')"), false);
  });

  it('uses transactional structured restore rather than psql input', async () => {
    const source = await repositoryFile('src/lib/db-backup.ts');
    assert.equal(source.includes("'psql'"), false);
    assert.equal(source.includes('database.sql'), false);
    assert.match(source, /'--single-transaction'/);
    assert.match(source, /timeout: DATABASE_COMMAND_TIMEOUT_MS/);
    assert.match(source, /withUploadsMaintenanceLock/);
    assert.match(source, /createInflateRaw/);
    assert.match(source, /reconcileScreenshotStorage/);
  });

  it('re-parses scanner exports on confirm instead of trusting client candidate JSON', async () => {
    const action = await repositoryFile('src/app/actions/scanner-import.ts');
    assert.match(action, /parseScannerExport\(await file\.text\(\), format\)/);
    assert.equal(action.includes("form.get('candidates')"), false);
    assert.match(action, /consumeRateLimitAttempt\(`scanner-import-preview:/);
    assert.match(action, /consumeRateLimitAttempt\(`scanner-import-confirm:/);
    assert.match(action, /createMany/);
  });

  it('enforces one shared finding capacity across every creation path', async () => {
    for (const path of [
      'src/app/actions/finding.ts',
      'src/app/actions/templates.ts',
      'src/app/actions/scanner-import.ts',
    ]) {
      assert.match(await repositoryFile(path), /assertFindingCreationCapacity/);
    }
    const page = await repositoryFile('src/app/dashboard/findings/page.tsx');
    const engagements = await repositoryFile('src/app/dashboard/engagements/page.tsx');
    const reports = await repositoryFile('src/app/dashboard/reports/page.tsx');
    assert.match(page, /take: PAGE_SIZE \+ 1/);
    assert.match(page, /LIMIT \$\{PAGE_SIZE \+ 1\} OFFSET \$\{offset\}/);
    assert.match(engagements, /take: MAX_FINDINGS_PER_ENGAGEMENT/);
    assert.match(reports, /loadReportEditorFindings/);
  });

  it('revalidates issued content and bounds expensive report rendering', async () => {
    const action = await repositoryFile('src/app/actions/reports.ts');
    const route = await repositoryFile('src/app/api/reports/[id]/route.ts');
    assert.match(action, /assertReportBlueprintUnchanged/);
    assert.match(action, /withReportRenderCapacity/);
    assert.match(route, /withReportRenderCapacity/);
    assert.match(route, /status: 503/);
  });

  it('coordinates upload writes with maintenance and checks quota before writing', async () => {
    const action = await repositoryFile('src/app/actions/finding.ts');
    assert.match(action, /withUploadsMaintenanceLock/);
    assert.match(action, /stageScreenshotDeletion/);
    assert.match(action, /restoreStagedScreenshotDeletion/);
    assert.match(action, /reconcileScreenshotStorage/);
    assert.ok(action.indexOf('assertScreenshotQuota({') < action.indexOf('writeFile(temporaryPath'));
  });

  it('does not make login availability depend on a global request budget', async () => {
    const limiter = await repositoryFile('src/lib/auth/login-rate-limit.ts');
    assert.equal(limiter.includes('login:global'), false);
  });

  it('applies source and account login budgets and releases successful reservations', async () => {
    const service = await repositoryFile('src/lib/auth/login-service.ts');
    const route = await repositoryFile('src/app/api/auth/login/route.ts');
    const limiter = await repositoryFile('src/lib/auth/login-rate-limit.ts');
    assert.match(service, /consumeLoginRateLimitAttempt\(clientIp, username\)/);
    assert.match(service, /releaseLoginRateLimitAttempt\(clientIp, username\)/);
    assert.match(route, /readLoginForm\(request\)/);
    assert.match(limiter, /accountLoginRateLimitKey\(username\)/);
    assert.match(limiter, /`login:source:\$\{clientIp\}`/);
  });

  it('backs signed cookies with revocable server-side sessions', async () => {
    const session = await repositoryFile('src/lib/auth/session.ts');
    const auth = await repositoryFile('src/app/actions/auth.ts');
    const users = await repositoryFile('src/app/actions/user.ts');
    assert.match(session, /prisma\.session\.findUnique/);
    assert.match(session, /prisma\.session\.deleteMany/);
    assert.match(session, /MAX_ACTIVE_SESSIONS_PER_USER/);
    assert.match(session, /pg_advisory_xact_lock/);
    assert.match(auth, /prisma\.session\.deleteMany/);
    assert.match(users, /tx\.session\.deleteMany/);
  });

  it('retries and surfaces pending evidence cleanup', async () => {
    const layout = await repositoryFile('src/app/dashboard/layout.tsx');
    const storage = await repositoryFile('src/lib/screenshot-storage.ts');
    const audit = await repositoryFile('src/lib/audit-log.ts');
    assert.match(layout, /ensureReconciledScreenshotStorage/);
    assert.match(layout, /Evidence storage cleanup requires operator attention/);
    assert.match(layout, /console\.error\('Evidence storage reconciliation requires operator attention\.', error\)/);
    const finding = await repositoryFile('src/app/actions/finding.ts');
    assert.equal(finding.match(/console\.error\('Evidence cleanup is pending; reconciliation will retry it\.', error\)/g)?.length, 2);
    assert.match(storage, /reconciliationRequired = true/);
    assert.match(audit, /'evidence\.cleanup'/);
  });

  it('serializes seed credential replacement with a recoverable database lock', async () => {
    const seed = await repositoryFile('prisma/seed.ts');
    assert.match(seed, /pg_advisory_lock/);
    assert.match(seed, /pg_advisory_unlock/);
    assert.doesNotMatch(seed, /credentialsPath}\.lock/);
  });

  it('prevents browser caching of confidential screenshots', async () => {
    const route = await repositoryFile('src/app/api/uploads/[filename]/route.ts');
    assert.match(route, /'Cache-Control': 'private, no-store'/);
    assert.equal(route.includes('max-age'), false);
  });

  it('keeps global appearance changes behind server-side admin authorization', async () => {
    const action = await repositoryFile('src/app/actions/settings.ts');
    const layout = await repositoryFile('src/app/layout.tsx');
    const reset = await repositoryFile('src/lib/db-backup.ts');
    const seed = await repositoryFile('prisma/seed.ts');
    const migration = await repositoryFile(
      'prisma/migrations/20260902120000_add_application_highlight_setting/migration.sql'
    );
    assert.match(action, /^'use server';/);
    assert.match(action, /await requireAdminAuth\(\)/);
    assert.match(action, /isHighlightColor\(highlightColor\)/);
    assert.match(layout, /data-highlight-color=/);
    assert.match(reset, /transaction\.applicationSetting\.create/);
    assert.match(seed, /applicationSetting\.upsert/);
    assert.match(migration, /VALUES \(1, 'Pink', CURRENT_TIMESTAMP\)/);
  });

  it('does not pipe a remote installer to root or print generated secrets', async () => {
    const setup = await repositoryFile('setup.sh');
    const summary = setup.slice(setup.indexOf('print_summary()'), setup.indexOf('\nmain()'));
    assert.doesNotMatch(setup, /curl[^\n]*\|[^\n]*sudo[^\n]*bash/);
    assert.match(setup, /npm ci/);
    assert.match(setup, /umask 077/);
    assert.equal(setup.includes('urlencode "$DB_PASSWORD"'), false);
    assert.match(setup, /urllib\.parse\.quote\(sys\.stdin\.read\(\)/);
    assert.equal(summary.includes('$DB_PASSWORD'), false);
    assert.match(setup, /build_production_application/);
    assert.match(summary, /NODE_ENV=production npm run start/);
    assert.match(summary, /Do not expose the Next\.js development server in production/);
  });

  it('rejects legacy setup password arguments with an actionable migration example', () => {
    for (const argument of ['--db-pass=do-not-print-this', '--db-pass']) {
      const result = spawnSync('bash', ['setup.sh', argument], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /--db-pass-file=\/secure\/db-password/);
      assert.doesNotMatch(result.stderr, /do-not-print-this/);
    }
  });

  it('pins every registry dependency artifact in package-lock.json', async () => {
    const lock = JSON.parse(await repositoryFile('package-lock.json')) as {
      packages: Record<string, { integrity?: string; link?: boolean }>;
    };
    const missing = Object.entries(lock.packages)
      .filter(([key, value]) => key && value.link !== true && !value.integrity)
      .map(([key]) => key);
    assert.deepEqual(missing, []);
  });
});
