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
      userId,
      role: 'User',
      lastPasswordChange: lastPasswordChange.toISOString(),
    });

    return new NextRequest('https://example.test/login', {
      headers: { cookie: `session=${token}` },
    });
  }

  it('rejects a signed session after its user is deleted', async (t) => {
    const findUnique = prisma.user.findUnique;
    prisma.user.findUnique = (async () => null) as typeof prisma.user.findUnique;
    t.after(() => {
      prisma.user.findUnique = findUnique;
    });

    assert.equal(await getSessionFromRequest(await sessionRequest()), null);
  });

  it('accepts a signed session for an existing user', async (t) => {
    const findUnique = prisma.user.findUnique;
    prisma.user.findUnique = (async () => ({
      role: 'User',
      lastPasswordChange,
    })) as unknown as typeof prisma.user.findUnique;
    t.after(() => {
      prisma.user.findUnique = findUnique;
    });

    assert.deepEqual(await getSessionFromRequest(await sessionRequest()), {
      userId,
      role: 'User',
      lastPasswordChange: lastPasswordChange.toISOString(),
    });
  });
});
