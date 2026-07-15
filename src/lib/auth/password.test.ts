import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
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
