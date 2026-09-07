import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

import {
  BACKUP_DIR_NAME,
  backupFilename,
  formatBackupPathForDisplay,
  resolveBackupFilePath,
} from './backup-path';

const backupDir = resolve(process.cwd(), BACKUP_DIR_NAME);

describe('backupFilename', () => {
  it('uses date and minute precision without a random suffix', () => {
    assert.match(backupFilename(), /^em-backup-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/);
  });
});

describe('resolveBackupFilePath', () => {
  it('resolves allowlisted backup filenames under the project backups directory', () => {
    const name = 'em-backup-2026-06-02-1430.zip';
    assert.equal(resolveBackupFilePath(name), resolve(join(backupDir, name)));
  });

  it('rejects path traversal, legacy names, and non-allowlisted names', () => {
    assert.equal(resolveBackupFilePath('../em-backup-2026-06-02-14-30.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30.zip/../x'), null);
    assert.equal(resolveBackupFilePath('not-a-backup.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30-45.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30-45-a1b2c3d4e5f6.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30-a1b2c3d4e5f6.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-1430-a1b2c3d4e5f6.zip'), null);
    assert.equal(resolveBackupFilePath('em-backup-2026-06-02-14-30.zip\0evil'), null);
    assert.equal(resolveBackupFilePath(''), null);
  });
});

describe('formatBackupPathForDisplay', () => {
  it('shows a path relative to the application root', () => {
    const name = 'em-backup-2026-06-02-1430.zip';
    assert.equal(
      formatBackupPathForDisplay(resolve(backupDir, name)),
      `${BACKUP_DIR_NAME}/${name}`,
    );
  });
});
