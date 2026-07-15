import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

// Ensure JWT signing works under the test runner (may not load .env)
process.env.JWT_SECRET ??= 'test-only-jwt-secret-at-least-32-chars!!';

describe('backup download tokens', () => {
  const filename = 'em-backup-2026-06-02-14-30.zip';
  const userId = '11111111-1111-4111-8111-111111111111';

  let createBackupDownloadToken: typeof import('./backup-download-token').createBackupDownloadToken;
  let verifyBackupDownloadToken: typeof import('./backup-download-token').verifyBackupDownloadToken;

  before(async () => {
    ({ createBackupDownloadToken, verifyBackupDownloadToken } = await import(
      './backup-download-token'
    ));
  });

  it('mints a token that verifies for the same user and file', async () => {
    const token = await createBackupDownloadToken(userId, filename);
    assert.ok(token);
    assert.equal(await verifyBackupDownloadToken(token!, userId, filename), true);
  });

  it('rejects tokens for a different user or filename', async () => {
    const token = await createBackupDownloadToken(userId, filename);
    assert.ok(token);
    assert.equal(
      await verifyBackupDownloadToken(token!, '22222222-2222-4222-8222-222222222222', filename),
      false
    );
    assert.equal(
      await verifyBackupDownloadToken(token!, userId, 'em-backup-2026-06-02-15-00.zip'),
      false
    );
  });

  it('rejects path-traversal filenames when minting', async () => {
    assert.equal(await createBackupDownloadToken(userId, '../secret.zip'), null);
    assert.equal(await createBackupDownloadToken(userId, 'not-a-backup.zip'), null);
  });

  it('rejects garbage tokens', async () => {
    assert.equal(await verifyBackupDownloadToken('not.a.jwt', userId, filename), false);
    assert.equal(await verifyBackupDownloadToken('', userId, filename), false);
  });
});
