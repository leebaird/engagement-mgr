import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest, getSessionJwtFromRequest } from '@/lib/auth/session';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * CSP with per-request nonces. Next.js reads the nonce from the request
 * Content-Security-Policy header and applies it to framework scripts automatically
 * (see Next.js CSP guide). Layout also exposes x-nonce for any explicit Script tags.
 */
function buildCsp(nonce: string): string {
  const scriptSrc = isProduction
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;

  // Inline style attributes are used throughout the UI; keep style-src permissive.
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function withSecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

const LEGACY_DASHBOARD_PATHS = [
  '/engagements',
  '/clients',
  '/contacts',
  '/findings',
  '/operators',
  '/users',
] as const;

function legacyDashboardRedirect(
  pathname: string,
  request: NextRequest,
  csp: string
): NextResponse | null {
  if (pathname === '/dash2' || pathname.startsWith('/dash2/')) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL('/dashboard', request.url)),
      csp
    );
  }

  for (const legacyPath of LEGACY_DASHBOARD_PATHS) {
    if (pathname === legacyPath || pathname.startsWith(`${legacyPath}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard${pathname}`;
      return withSecurityHeaders(NextResponse.redirect(url), csp);
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Prefer base64 nonces (Next.js CSP guide); still unique per request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next extracts the nonce from this request header during SSR
  requestHeaders.set('Content-Security-Policy', csp);

  const legacyRedirect = legacyDashboardRedirect(pathname, request, csp);
  if (legacyRedirect) {
    return legacyRedirect;
  }

  // JWT-first gate. Protected pages enforce revocation and role freshness in
  // their layouts/actions; login redirects are DB-validated below.
  const session = await getSessionJwtFromRequest(request);
  const isLoginPage = pathname === '/login';
  const isChangePasswordPage = pathname === '/change-password';

  if (!session && !isLoginPage) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)), csp);
  }

  if (session && isLoginPage) {
    const dbSession = await getSessionFromRequest(request);
    if (dbSession) {
      return withSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)), csp);
    }
  }

  // Fast path for password rotation using JWT claim (DB confirms in layout)
  if (session && !isLoginPage && !isChangePasswordPage) {
    const lastPasswordChange = new Date(session.lastPasswordChange);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    if (
      !Number.isNaN(lastPasswordChange.getTime()) &&
      lastPasswordChange < ninetyDaysAgo
    ) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL('/change-password', request.url)),
        csp
      );
    }
  }

  return withSecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    csp
  );
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
