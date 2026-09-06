import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_BROWSER_BACKUP_BYTES, validateBackupFile } from './db';

describe('validateBackupFile', () => {
  it('accepts Engagement Manager ZIP backups', () => {
    const result = validateBackupFile(new File(['zip'], 'em-backup.zip', { type: 'application/zip' }));
    assert.equal(result.ok, true);
  });

  it('rejects plain SQL restore files', () => {
    const result = validateBackupFile(new File(['\\! id'], 'backup.sql', { type: 'text/plain' }));
    assert.equal(result.ok, false);
  });

  it('directs oversized browser restores to the bounded offline command', () => {
    const result = validateBackupFile(
      new File([new Uint8Array(MAX_BROWSER_BACKUP_BYTES + 1)], 'em-backup.zip')
    );
    assert.deepEqual(result, {
      ok: false,
      error:
        'This backup is too large for browser restore. Use npm run db:restore -- /path/to/backup.zip on the application server.',
    });
  });
});
