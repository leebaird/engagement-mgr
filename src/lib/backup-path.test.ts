import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

import { BACKUP_DIR_NAME, resolveBackupFilePath } from './backup-path';

describe('resolveBackupFilePath', () => {
  it('resolves allowlisted backup filenames under the backup directory', () => {
    const name = 'em-backup-2026-06-02-14-30.zip';
    const expected = resolve(join(homedir(), BACKUP_DIR_NAME, name));
    assert.equal(resolveBackupFilePath(name), expected);
  });

  it('rejects path traversal and non-allowlisted names', () => {
    assert.equal(resolveBackupFilePath('../em-backup-2026-06-02-14-30.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30.zip/../x'), null);
    assert.equal(resolveBackupFilePath('not-a-backup.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30.zip\0evil'), null);
    assert.equal(resolveBackupFilePath(''), null);
  });
});
