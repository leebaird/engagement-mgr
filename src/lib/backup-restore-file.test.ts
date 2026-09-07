import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readBackupArchiveFile } from './backup-restore-file';
import { MAX_BACKUP_BYTES } from './validation/db';

async function withTempDirectory(
  prefix: string,
  operation: (directory: string) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  try {
    await operation(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('offline backup restore input', () => {
  it('loads .env and rejects missing database configuration before reading an archive', async () => {
    await withTempDirectory('restore-env-', async (root) => {
      const env: NodeJS.ProcessEnv = { ...process.env, TSX_TSCONFIG_PATH: join(process.cwd(), 'tsconfig.json') };
      delete env.DATABASE_URL;
      delete env.DOTENV_CONFIG_PATH;
      delete env.NODE_TEST_CONTEXT;
      const run = (databaseUrl?: string) => spawnSync(process.execPath, [
        '--import', createRequire(join(process.cwd(), 'package.json')).resolve('tsx'),
        join(process.cwd(), 'scripts/restore-backup.ts'),
        join(root, 'missing.zip'),
      ], {
        cwd: root,
        env: databaseUrl === undefined ? env : { ...env, DATABASE_URL: databaseUrl },
        encoding: 'utf8',
        timeout: 10000,
      });
      const missing = run();
      assert.ifError(missing.error);
      assert.equal(missing.status, 1);
      assert.match(missing.stderr, /DATABASE_URL must be set/);
      assert.doesNotMatch(missing.stderr, /readable regular file/);
      await writeFile(join(root, '.env'), 'DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/fixture\n');
      const loaded = run();
      assert.ifError(loaded.error);
      assert.equal(loaded.status, 1);
      assert.match(loaded.stderr, /readable regular file/);
      assert.doesNotMatch(loaded.stderr, /DATABASE_URL must be set/);
      const blank = run('   ');
      assert.ifError(blank.error);
      assert.equal(blank.status, 1);
      assert.match(blank.stderr, /DATABASE_URL must be set/);
    });
  });

  it('reads a bounded regular archive', async () => {
    await withTempDirectory('restore-file-', async (root) => {
      const path = join(root, 'backup.zip');
      await writeFile(path, 'archive');
      assert.equal((await readBackupArchiveFile(path)).toString(), 'archive');
    });
  });

  it('rejects symlinks and oversized sparse files before reading', async () => {
    await withTempDirectory('restore-file-', async (root) => {
      const target = join(root, 'target.zip');
      const link = join(root, 'link.zip');
      await writeFile(target, 'archive');
      await symlink(target, link);
      await assert.rejects(readBackupArchiveFile(link), /regular file/);

      const oversized = join(root, 'oversized.zip');
      await writeFile(oversized, 'x');
      await truncate(oversized, MAX_BACKUP_BYTES + 1);
      await assert.rejects(readBackupArchiveFile(oversized), /regular file/);
    });
  });
});
