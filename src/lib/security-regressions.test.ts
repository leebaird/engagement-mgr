import assert from 'node:assert/strict';
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
  });

  it('coordinates upload writes with maintenance and checks quota before writing', async () => {
    const action = await repositoryFile('src/app/actions/finding.ts');
    assert.match(action, /withUploadsMaintenanceLock/);
    assert.ok(action.indexOf('assertScreenshotQuota({') < action.indexOf('writeFile(temporaryPath'));
  });

  it('does not make login availability depend on a global request budget', async () => {
    const limiter = await repositoryFile('src/lib/auth/login-rate-limit.ts');
    assert.equal(limiter.includes('login:global'), false);
  });

  it('prevents browser caching of confidential screenshots', async () => {
    const route = await repositoryFile('src/app/api/uploads/[filename]/route.ts');
    assert.match(route, /'Cache-Control': 'private, no-store'/);
    assert.equal(route.includes('max-age'), false);
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
