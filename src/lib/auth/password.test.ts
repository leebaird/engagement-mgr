import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  runPasswordVerification,
  validatePasswordComplexity,
} from './password';

describe('validatePasswordComplexity', () => {
  const valid = 'Aa1!' + 'x'.repeat(12);

  it('accepts a policy-compliant password within length bounds', () => {
    assert.equal(validatePasswordComplexity(valid).valid, true);
  });

  it('rejects passwords longer than MAX_PASSWORD_LENGTH', () => {
    const tooLong = `${valid}${'y'.repeat(MAX_PASSWORD_LENGTH)}`;
    const result = validatePasswordComplexity(tooLong);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('at most')));
  });

  it('rejects passwords shorter than MIN_PASSWORD_LENGTH', () => {
    const result = validatePasswordComplexity('Aa1!');
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes(`at least ${MIN_PASSWORD_LENGTH}`)));
  });
});

describe('password verification capacity', () => {
  it('fails fast when all verification slots are occupied', async () => {
    const capacity = { active: 0, limit: 2 };
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = runPasswordVerification(async () => blocked, capacity);
    const second = runPasswordVerification(async () => blocked, capacity);
    const rejected = await runPasswordVerification(async () => true, capacity);
    assert.deepEqual(rejected, { status: 'busy' });

    release();
    assert.equal((await first).status, 'completed');
    assert.equal((await second).status, 'completed');
    assert.equal(capacity.active, 0);
  });
});
