import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  generateTemporaryAdminPassword,
  seedDefaultAdminUser,
} from './seed-default-admin';
import { validatePasswordComplexity } from './auth/password';

describe('default admin seed credentials', () => {
  it('generates a temporary password that is not the old default and satisfies policy', () => {
    const password = generateTemporaryAdminPassword();

    assert.notEqual(password, 'admin');
    assert.equal(validatePasswordComplexity(password).valid, true);
  });

  it('rejects weak caller-supplied passwords before seeding', async () => {
    await assert.rejects(
      () => seedDefaultAdminUser('admin'),
      /does not meet the password policy/
    );
  });
});
