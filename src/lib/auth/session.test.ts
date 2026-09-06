import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { NextRequest } from 'next/server';

process.env.JWT_SECRET ??= 'test-only-jwt-secret-at-least-32-chars!!';

describe('getSessionFromRequest', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const lastPasswordChange = new Date('2026-07-01T12:00:00.000Z');

  let encrypt: typeof import('./session').encrypt;
  let getSessionFromRequest: typeof import('./session').getSessionFromRequest;
  let prisma: typeof import('@/lib/db').prisma;

  before(async () => {
    ({ encrypt, getSessionFromRequest } = await import('./session'));
    ({ prisma } = await import('@/lib/db'));
  });

  async function sessionRequest() {
    const token = await encrypt({
      sessionId: '22222222-2222-4222-8222-222222222222',
      userId,
      role: 'User',
      lastPasswordChange: lastPasswordChange.toISOString(),
    });

    return new NextRequest('https://example.test/login', {
      headers: { cookie: `session=${token}` },
    });
  }

  it('rejects a signed session after its user is deleted', async (t) => {
    const findUnique = prisma.session.findUnique;
    prisma.session.findUnique = (async () => null) as unknown as typeof prisma.session.findUnique;
    t.after(() => {
      prisma.session.findUnique = findUnique;
    });

    assert.equal(await getSessionFromRequest(await sessionRequest()), null);
  });

  it('rejects pre-migration tokens without querying an undefined session id', async (t) => {
    const findUnique = prisma.session.findUnique;
    let queried = false;
    prisma.session.findUnique = (async () => {
      queried = true;
      return null;
    }) as unknown as typeof prisma.session.findUnique;
    t.after(() => {
      prisma.session.findUnique = findUnique;
    });
    const token = await encrypt({
      sessionId: undefined as unknown as string,
      userId,
      role: 'User',
      lastPasswordChange: lastPasswordChange.toISOString(),
    });
    const request = new NextRequest('https://example.test/login', {
      headers: { cookie: `session=${token}` },
    });

    assert.equal(await getSessionFromRequest(request), null);
    assert.equal(queried, false);
  });

  it('accepts a signed session for an existing user', async (t) => {
    const findUnique = prisma.session.findUnique;
    prisma.session.findUnique = (async () => ({
      userId,
      expiresAt: new Date(Date.now() + 60_000),
      user: { role: 'User', lastPasswordChange },
    })) as unknown as typeof prisma.session.findUnique;
    t.after(() => {
      prisma.session.findUnique = findUnique;
    });

    assert.deepEqual(await getSessionFromRequest(await sessionRequest()), {
      sessionId: '22222222-2222-4222-8222-222222222222',
      userId,
      role: 'User',
      lastPasswordChange: lastPasswordChange.toISOString(),
    });
  });

  it('rejects a signed session after admin password reset to epoch', async (t) => {
    const findUnique = prisma.session.findUnique;
    prisma.session.findUnique = (async () => ({
      userId,
      expiresAt: new Date(Date.now() + 60_000),
      user: { role: 'User', lastPasswordChange: new Date(0) },
    })) as unknown as typeof prisma.session.findUnique;
    t.after(() => {
      prisma.session.findUnique = findUnique;
    });

    assert.equal(await getSessionFromRequest(await sessionRequest()), null);
  });

  it('rejects a correctly signed token after its session is revoked', async (t) => {
    const findUnique = prisma.session.findUnique;
    prisma.session.findUnique = (async () => null) as unknown as typeof prisma.session.findUnique;
    t.after(() => {
      prisma.session.findUnique = findUnique;
    });

    assert.equal(await getSessionFromRequest(await sessionRequest()), null);
  });

  it('rejects an expired server-side session', async (t) => {
    const findUnique = prisma.session.findUnique;
    prisma.session.findUnique = (async () => ({
      userId,
      expiresAt: new Date(Date.now() - 1),
      user: { role: 'User', lastPasswordChange },
    })) as unknown as typeof prisma.session.findUnique;
    t.after(() => {
      prisma.session.findUnique = findUnique;
    });

    assert.equal(await getSessionFromRequest(await sessionRequest()), null);
  });
});

describe('session admission limits', () => {
  it('keeps at most ten active sessions per user', async () => {
    const { MAX_ACTIVE_SESSIONS_PER_USER, selectSessionIdsToRetire } =
      await import('./session');
    assert.equal(MAX_ACTIVE_SESSIONS_PER_USER, 10);
    assert.deepEqual(selectSessionIdsToRetire(Array.from({ length: 9 }, (_, i) => `${i}`)), []);
    assert.deepEqual(
      selectSessionIdsToRetire(Array.from({ length: 10 }, (_, i) => `${i}`)),
      ['0']
    );
    assert.deepEqual(
      selectSessionIdsToRetire(Array.from({ length: 15 }, (_, i) => `${i}`)),
      ['0', '1', '2', '3', '4', '5']
    );
  });
});
