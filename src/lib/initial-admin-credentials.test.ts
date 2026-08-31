import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { writeInitialAdminCredentials } from './initial-admin-credentials';

describe('initial Admin credential handoff', () => {
  it('creates a new owner-only file without printing or overwriting it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'em-admin-credentials-'));
    const path = join(directory, 'credentials.txt');
    try {
      await writeInitialAdminCredentials(path, { username: 'admin', password: 'secret' });
      assert.equal((await stat(path)).mode & 0o777, 0o600);
      assert.equal(await readFile(path, 'utf8'), 'Username: admin\nTemporary password: secret\n');
      await assert.rejects(
        () => writeInitialAdminCredentials(path, { username: 'admin', password: 'other' }),
        /EEXIST/
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
