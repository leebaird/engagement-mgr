import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';

const isProduction = process.env.NODE_ENV === 'production';

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    isProduction
      ? `script-src 'self' 'nonce-${nonce}'`
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  if (pathname === '/dash2' || pathname.startsWith('/dash2/')) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)), csp);
  }

  const session = await getSession();
  const isLoginPage = pathname === '/login';

  if (!session && !isLoginPage) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)), csp);
  }

  if (session && isLoginPage) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)), csp);
  }

  // Check 90-day password rotation
  if (session && !isLoginPage) {
    const lastPasswordChange = new Date(session.lastPasswordChange);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const isChangePasswordPage = pathname === '/change-password';

    if (lastPasswordChange < ninetyDaysAgo && !isChangePasswordPage) {
      return withSecurityHeaders(NextResponse.redirect(new URL('/change-password', request.url)), csp);
    }
  }

  return withSecurityHeaders(NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  }), csp);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
