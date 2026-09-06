import assert from 'node:assert/strict';
import { mkdtemp, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
