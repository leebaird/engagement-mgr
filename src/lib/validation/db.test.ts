import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateBackupFile } from './db';

describe('validateBackupFile', () => {
  it('accepts Engagement Manager ZIP backups', () => {
    const result = validateBackupFile(new File(['zip'], 'em-backup.zip', { type: 'application/zip' }));
    assert.equal(result.ok, true);
  });

  it('rejects plain SQL restore files', () => {
    const result = validateBackupFile(new File(['\\! id'], 'backup.sql', { type: 'text/plain' }));
    assert.equal(result.ok, false);
  });
});
