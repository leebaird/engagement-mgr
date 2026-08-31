import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  consumeRateLimitAttempt,
  passwordConfirmationRateLimitKey,
  sourceLoginRateLimitKey,
} from './login-rate-limit';

describe('login rate-limit keys', () => {
  it('keeps source budgets independent of usernames', () => {
    assert.equal(sourceLoginRateLimitKey('203.0.113.10'), 'login:source:203.0.113.10');
    assert.equal(
      passwordConfirmationRateLimitKey('user-id'),
      'password-confirmation:user-id'
    );
  });
});

describe('consumeRateLimitAttempt', () => {
  it('uses one atomic reservation result to enforce the attempt ceiling', async () => {
    let count = 0;
    let calls = 0;
    const client = {
      $queryRawUnsafe: async () => {
        calls += 1;
        count += 1;
        return [{ count, resetAt: new Date(Date.now() + 60_000) }];
      },
    };

    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        consumeRateLimitAttempt(
          'test',
          { maxAttempts: 5, windowMs: 60_000 },
          client as never
        )
      )
    );

    assert.equal(calls, 12);
    assert.equal(results.filter((result) => result.allowed).length, 5);
    assert.equal(results.filter((result) => !result.allowed).length, 7);
  });
});
