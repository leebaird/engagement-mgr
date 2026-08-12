import { getSession, isPasswordRotationRequired, type SessionPayload } from '@/lib/auth/session';

export type AdminError = { error: 'Unauthorized' };
export type AdminResult = SessionPayload | AdminError;

export function isAdminError(result: AdminResult): result is AdminError {
  return 'error' in result;
}

export async function requireAdminAuth(): Promise<AdminResult> {
  const session = await getSession();
  if (!session || session.role !== 'Admin' || isPasswordRotationRequired(session.lastPasswordChange)) {
    return { error: 'Unauthorized' };
  }
  return session;
}

/** @deprecated Prefer requireAdminAuth() for consistent error handling. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'Admin' || isPasswordRotationRequired(session.lastPasswordChange)) {
    return null;
  }
  return session;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  return url;
}

/** Connection string for pg_dump/psql (strips Prisma-only query params such as schema=). */
export function getPgToolsConnectionUrl(): string {
  const parsed = new URL(getDatabaseUrl());
  const prismaOnlyParams = [
    'schema',
    'connection_limit',
    'pool_timeout',
    'connect_timeout',
    'socket_timeout',
    'statement_cache_size',
    'pgbouncer',
  ];
  for (const key of prismaOnlyParams) {
    parsed.searchParams.delete(key);
  }
  if (!parsed.searchParams.toString()) {
    parsed.search = '';
  }
  return parsed.toString();
}