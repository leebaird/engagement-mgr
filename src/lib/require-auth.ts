import { getSession, isPasswordRotationRequired, type SessionPayload } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export type AuthError = { error: 'Unauthorized' };
export type AuthResult = SessionPayload | AuthError;

export function isAuthError(result: AuthResult): result is AuthError {
  return 'error' in result;
}

export async function requireAuth(): Promise<AuthResult> {
  const session = await getSession();
  if (!session || isPasswordRotationRequired(session.lastPasswordChange)) {
    return { error: 'Unauthorized' };
  }
  return session;
}

export async function requireDashboardSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  if (isPasswordRotationRequired(session.lastPasswordChange)) {
    redirect('/change-password');
  }
  return session;
}
