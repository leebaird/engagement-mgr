import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { NextRequest } from 'next/server';

process.env.JWT_SECRET ??= 'test-only-jwt-secret-at-least-32-chars!!';

describe('proxy', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const sessionId = '22222222-2222-4222-8222-222222222222';

  let proxy: typeof import('./proxy').proxy;
  let encrypt: typeof import('@/lib/auth/session').encrypt;
  let prisma: typeof import('@/lib/db').prisma;

  before(async () => {
    ({ proxy } = await import('./proxy'));
    ({ encrypt } = await import('@/lib/auth/session'));
    ({ prisma } = await import('@/lib/db'));
  });

  async function request(path: string, lastPasswordChange?: string) {
    const headers: Record<string, string> = {};
    if (lastPasswordChange !== undefined) {
      const token = await encrypt({ sessionId, userId, role: 'User', lastPasswordChange });
      headers.cookie = `session=${token}`;
    }
    return new NextRequest(`https://example.test${path}`, { headers });
  }

  const daysAgo = (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  function redirectPath(response: Response): string | null {
    const location = response.headers.get('location');
    return location ? new URL(location).pathname : null;
  }

  it('sends visitors without a valid session to login with a CSP', async () => {
    const response = await proxy(await request('/dashboard/findings'));
    assert.equal(redirectPath(response), '/login');
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'self'/);

    const forged = new NextRequest('https://example.test/dashboard', {
      headers: { cookie: 'session=not-a-signed-token' },
    });
    assert.equal(redirectPath(await proxy(forged)), '/login');
  });

  it('redirects legacy paths into the dashboard', async () => {
    assert.equal(redirectPath(await proxy(await request('/engagements/abc'))), '/dashboard/engagements/abc');
    assert.equal(redirectPath(await proxy(await request('/dash2/anything'))), '/dashboard');
  });

  it('passes a per-request nonce to rendering that matches the response CSP', async () => {
    const first = await proxy(await request('/dashboard', daysAgo(1)));
    const second = await proxy(await request('/dashboard', daysAgo(1)));
    assert.equal(redirectPath(first), null);

    const nonce = first.headers.get('x-middleware-request-x-nonce');
    assert.ok(nonce);
    assert.notEqual(nonce, second.headers.get('x-middleware-request-x-nonce'));
    const csp = first.headers.get('content-security-policy') ?? '';
    assert.ok(csp.includes(`'nonce-${nonce}'`));
    assert.equal(first.headers.get('x-middleware-request-content-security-policy'), csp);
  });

  it('forces a password change after 90 days, or when the claim is unreadable', async () => {
    assert.equal(redirectPath(await proxy(await request('/dashboard', daysAgo(91)))), '/change-password');
    assert.equal(redirectPath(await proxy(await request('/dashboard', 'not-a-date'))), '/change-password');
    assert.equal(redirectPath(await proxy(await request('/dashboard', daysAgo(89)))), null);
    assert.equal(redirectPath(await proxy(await request('/change-password', daysAgo(91)))), null);
  });

  it('only skips the login page for a session the database still accepts', async (t) => {
    const lastPasswordChange = new Date(daysAgo(1));
    const findUnique = prisma.session.findUnique;
    t.after(() => {
      prisma.session.findUnique = findUnique;
    });

    prisma.session.findUnique = (async () => null) as unknown as typeof prisma.session.findUnique;
    const revoked = await proxy(await request('/login', lastPasswordChange.toISOString()));
    assert.equal(redirectPath(revoked), null);
    // The revoked cookie is cleared so later visits stop detouring through its stale claims.
    assert.match(revoked.headers.get('set-cookie') ?? '', /^session=;.*Expires=Thu, 01 Jan 1970/);

    prisma.session.findUnique = (async () => ({
      userId,
      expiresAt: new Date(Date.now() + 60_000),
      user: { role: 'User', lastPasswordChange },
    })) as unknown as typeof prisma.session.findUnique;
    const live = await proxy(await request('/login', lastPasswordChange.toISOString()));
    assert.equal(redirectPath(live), '/dashboard');
    assert.equal(live.headers.get('set-cookie'), null);
  });
});
