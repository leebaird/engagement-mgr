import { getSession, isPasswordRotationRequired, type SessionPayload } from '@/lib/auth/session';

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