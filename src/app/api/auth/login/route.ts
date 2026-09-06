import { NextResponse, type NextRequest } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { authenticateLogin } from '@/lib/auth/login-service';
import { readLoginForm } from '@/lib/auth/login-request';
import { getClientIp } from '@/lib/request-client-ip';
import { loginSchema } from '@/lib/validation/auth';

export const runtime = 'nodejs';

function pathRedirect(pathname: string, error?: string) {
  const query = new URLSearchParams();
  if (error) query.set('error', error);
  const location = query.size ? `${pathname}?${query}` : pathname;
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location },
  });
}

export async function POST(request: NextRequest) {
  let form: URLSearchParams;
  try {
    form = await readLoginForm(request);
  } catch {
    return pathRedirect('/login', 'request');
  }
  const parsed = loginSchema.safeParse({
    username: form.get('username'),
    password: form.get('password'),
  });
  if (!parsed.success) return pathRedirect('/login', 'credentials');

  try {
    const result = await authenticateLogin(
      await getClientIp(),
      parsed.data.username,
      parsed.data.password
    );
    if (result.status === 'limited') {
      return pathRedirect('/login', `limited-${result.retryAfterMinutes}`);
    }
    if (result.status !== 'authenticated') {
      return pathRedirect(
        '/login',
        result.status === 'busy' ? 'busy' : 'credentials'
      );
    }

    await createSession({
      userId: result.userId,
      role: result.role,
      lastPasswordChange: result.lastPasswordChange.toISOString(),
    });
    return pathRedirect(
      result.needsPasswordChange ? '/change-password' : '/dashboard'
    );
  } catch (error) {
    console.error('Login error:', error);
    return pathRedirect('/login', 'generic');
  }
}
