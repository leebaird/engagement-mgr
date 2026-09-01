import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  accountLoginRateLimitKey,
  consumeLoginRateLimitAttempt,
  consumeRateLimitAttempt,
  LOGIN_RATE_LIMITS,
  passwordConfirmationRateLimitKey,
  releaseLoginRateLimitAttempt,
  sourceLoginRateLimitKey,
} from './login-rate-limit';

describe('login rate-limit keys', () => {
  it('builds separate real-source, sentinel-source, and account keys', () => {
    assert.equal(sourceLoginRateLimitKey('203.0.113.10', 'admin'), 'login:source:203.0.113.10');
    assert.equal(sourceLoginRateLimitKey('direct', 'admin'), 'login:source:direct:admin');
    assert.equal(sourceLoginRateLimitKey('unknown', 'Admin'), 'login:source:unknown:Admin');
    assert.equal(accountLoginRateLimitKey('Admin'), 'login:account:Admin');
    assert.equal(
      passwordConfirmationRateLimitKey('user-id'),
      'password-confirmation:user-id'
    );
    assert.ok(LOGIN_RATE_LIMITS.account.maxAttempts < LOGIN_RATE_LIMITS.source.maxAttempts);
  });
});

describe('consumeLoginRateLimitAttempt', () => {
  it('applies source and account budgets to direct connections', async () => {
    const counts = new Map<string, number>();
    const keys: string[] = [];
    const client = {
      $queryRawUnsafe: async (_query: string, key: string) => {
        keys.push(key);
        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        return [{ count, resetAt: new Date(Date.now() + 60_000) }];
      },
    };

    const results = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      results.push(await consumeLoginRateLimitAttempt('direct', 'Admin', client as never));
    }

    assert.equal(results.filter((result) => result.allowed).length, 5);
    assert.equal(results[5]?.allowed, false);
    assert.ok(keys.includes('login:source:direct:Admin'));
    assert.ok(keys.includes('login:account:Admin'));
  });

  it('shares the account budget across distinct sources', async () => {
    const counts = new Map<string, number>();
    const client = {
      $queryRawUnsafe: async (_query: string, key: string) => {
        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        return [{ count, resetAt: new Date(Date.now() + 60_000) }];
      },
    };

    const results = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      results.push(
        await consumeLoginRateLimitAttempt(
          `203.0.113.${attempt + 1}`,
          'admin',
          client as never
        )
      );
    }

    assert.equal(results.filter((result) => result.allowed).length, 5);
    assert.equal(results[5]?.allowed, false);
  });

  it('releases only the source reservation when the account budget denies', async () => {
    const sourceKey = sourceLoginRateLimitKey('203.0.113.10', 'locked-user');
    const accountKey = accountLoginRateLimitKey('locked-user');
    const resetAt = new Date(Date.now() + 60_000);
    const counts = new Map<string, number>([
      [sourceKey, 29],
      [accountKey, LOGIN_RATE_LIMITS.account.maxAttempts],
    ]);
    const releasedKeys: string[] = [];
    const client = {
      $queryRawUnsafe: async (query: string, ...parameters: unknown[]) => {
        const key = parameters[0] as string;
        if (query.includes('GREATEST')) {
          releasedKeys.push(key);
          counts.set(key, Math.max((counts.get(key) ?? 0) - 1, 0));
          return [{ key }];
        }

        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        return [{ count, resetAt }];
      },
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await consumeLoginRateLimitAttempt(
        '203.0.113.10',
        'locked-user',
        client as never
      );
      assert.equal(result.allowed, false);
    }

    assert.equal(counts.get(sourceKey), 29);
    assert.equal(counts.get(accountKey), LOGIN_RATE_LIMITS.account.maxAttempts + 3);
    assert.deepEqual(releasedKeys, [sourceKey, sourceKey, sourceKey]);
    assert.equal(
      (await consumeLoginRateLimitAttempt('203.0.113.10', 'other-user', client as never)).allowed,
      true
    );
  });

  it('does not release a reservation from a newer source window', async () => {
    const sourceKey = sourceLoginRateLimitKey('203.0.113.10', 'locked-user');
    const accountKey = accountLoginRateLimitKey('locked-user');
    const reservedResetAt = new Date(Date.now() + 60_000);
    const newerResetAt = new Date(reservedResetAt.getTime() + 60_000);
    const counts = new Map<string, number>([
      [sourceKey, 29],
      [accountKey, LOGIN_RATE_LIMITS.account.maxAttempts],
    ]);
    let sourceResetAt = reservedResetAt;
    let releaseQuery = '';
    let releaseParameters: unknown[] = [];
    const client = {
      $queryRawUnsafe: async (query: string, ...parameters: unknown[]) => {
        const key = parameters[0] as string;
        if (query.includes('GREATEST')) {
          releaseQuery = query;
          releaseParameters = parameters;
          if (parameters[1] === sourceResetAt) {
            counts.set(key, Math.max((counts.get(key) ?? 0) - 1, 0));
          }
          return [];
        }

        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        if (key === accountKey) {
          counts.set(sourceKey, 1);
          sourceResetAt = newerResetAt;
        }
        return [{ count, resetAt: key === sourceKey ? reservedResetAt : newerResetAt }];
      },
    };

    const result = await consumeLoginRateLimitAttempt(
      '203.0.113.10',
      'locked-user',
      client as never
    );

    assert.equal(result.allowed, false);
    assert.match(releaseQuery, /"key" = \$1 AND "resetAt" = \$2/);
    assert.deepEqual(releaseParameters, [sourceKey, reservedResetAt]);
    assert.equal(counts.get(sourceKey), 1);
    assert.equal(counts.get(accountKey), LOGIN_RATE_LIMITS.account.maxAttempts + 1);
  });

  it('releases only the current successful reservation', async () => {
    let query = '';
    let keys: string[] = [];
    const client = {
      $queryRawUnsafe: async (sql: string, ...parameters: string[]) => {
        query = sql;
        keys = parameters;
        return [];
      },
    };

    await releaseLoginRateLimitAttempt('direct', 'admin', client as never);

    assert.match(query, /GREATEST\("count" - 1, 0\)/);
    assert.deepEqual(keys, ['login:source:direct:admin', 'login:account:admin']);
  });

  it('does not make direct usernames share a global budget or erase prior source failures', async () => {
    const counts = new Map<string, number>();
    const client = {
      $queryRawUnsafe: async (query: string, ...keys: string[]) => {
        if (query.includes('GREATEST')) {
          for (const key of keys) {
            counts.set(key, Math.max((counts.get(key) ?? 0) - 1, 0));
          }
          return [];
        }

        const key = keys[0]!;
        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        return [{ count, resetAt: new Date(Date.now() + 60_000) }];
      },
    };

    for (let attempt = 0; attempt < 31; attempt += 1) {
      assert.equal(
        (await consumeLoginRateLimitAttempt('direct', `user-${attempt}`, client as never)).allowed,
        true
      );
    }

    for (let attempt = 0; attempt < 29; attempt += 1) {
      await consumeLoginRateLimitAttempt('203.0.113.10', `failed-${attempt}`, client as never);
    }
    assert.equal(
      (await consumeLoginRateLimitAttempt('203.0.113.10', 'valid-user', client as never)).allowed,
      true
    );
    await releaseLoginRateLimitAttempt('203.0.113.10', 'valid-user', client as never);
    assert.equal(
      (await consumeLoginRateLimitAttempt('203.0.113.10', 'failed-29', client as never)).allowed,
      true
    );
    assert.equal(
      (await consumeLoginRateLimitAttempt('203.0.113.10', 'failed-30', client as never)).allowed,
      false
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
