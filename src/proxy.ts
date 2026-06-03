import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/dash2' || pathname.startsWith('/dash2/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const session = await getSession();
  const isLoginPage = pathname === '/login';

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check 90-day password rotation
  if (session && !isLoginPage) {
    const lastPasswordChange = new Date(session.lastPasswordChange);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const isChangePasswordPage = pathname === '/change-password';

    if (lastPasswordChange < ninetyDaysAgo && !isChangePasswordPage) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
