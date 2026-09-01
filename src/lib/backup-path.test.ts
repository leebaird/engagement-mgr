import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

import { BACKUP_DIR_NAME, backupFilename, resolveBackupFilePath } from './backup-path';

describe('backupFilename', () => {
  it('adds seconds and a random suffix so rapid exports do not collide', () => {
    const first = backupFilename();
    const second = backupFilename();

    assert.match(first, /^em-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-[a-f0-9]{12}\.zip$/);
    assert.notEqual(first, second);
  });
});

describe('resolveBackupFilePath', () => {
  it('resolves allowlisted backup filenames under the backup directory', () => {
    const legacyName = 'em-backup-2026-06-02-14-30.zip';
    const name = 'em-backup-2026-06-02-14-30-45-a1b2c3d4e5f6.zip';
    assert.equal(
      resolveBackupFilePath(legacyName),
      resolve(join(homedir(), BACKUP_DIR_NAME, legacyName))
    );
    assert.equal(resolveBackupFilePath(name), resolve(join(homedir(), BACKUP_DIR_NAME, name)));
  });

  it('rejects path traversal and non-allowlisted names', () => {
    assert.equal(resolveBackupFilePath('../em-backup-2026-06-02-14-30.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30.zip/../x'), null);
    assert.equal(resolveBackupFilePath('not-a-backup.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30-45.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30-a1b2c3d4e5f6.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30.zip\0evil'), null);
    assert.equal(resolveBackupFilePath(''), null);
  });
});
