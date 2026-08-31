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

function decodeUrlComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error('DATABASE_URL contains invalid encoding');
  }
}

function escapePgPassField(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:');
}

export function getPgToolsConnection(): { connectionUrl: string; pgPassLine: string } {
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
  const password = decodeUrlComponent(parsed.password);
  if (password.includes('\n') || password.includes('\r')) {
    throw new Error('DATABASE_URL password contains an unsupported newline');
  }
  const database = decodeUrlComponent(parsed.pathname.replace(/^\//, ''));
  const username = decodeUrlComponent(parsed.username);
  const host = parsed.hostname.replace(/^\[(.*)\]$/, '$1');
  const port = parsed.port || '5432';
  parsed.password = '';
  if (!parsed.searchParams.toString()) {
    parsed.search = '';
  }
  return {
    connectionUrl: parsed.toString(),
    pgPassLine: [host, port, database, username, password].map(escapePgPassField).join(':'),
  };
}
