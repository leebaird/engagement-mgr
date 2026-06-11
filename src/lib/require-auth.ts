import { getSession, type SessionPayload } from '@/lib/auth/session';

export type AuthError = { error: 'Unauthorized' };
export type AuthResult = SessionPayload | AuthError;

export function isAuthError(result: AuthResult): result is AuthError {
  return 'error' in result;
}

export async function requireAuth(): Promise<AuthResult> {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }
  return session;
}