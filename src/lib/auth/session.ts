import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { getJwtSecretKey } from '@/lib/jwt-secret';
import { prisma } from '@/lib/db';

let encodedKey: Uint8Array | undefined;

function getEncodedKey(): Uint8Array {
  encodedKey ??= getJwtSecretKey();
  return encodedKey;
}

export interface SessionPayload {
  userId: string;
  role: 'Admin' | 'User';
  lastPasswordChange: string;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // 1 day session
    .sign(getEncodedKey());
}

export async function decrypt(session: string | undefined = '') {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const session = await encrypt(payload);

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * JWT claims from the session cookie only — no database round-trip.
 * Used by the edge proxy for fast auth redirects. Role/revocation must
 * still be enforced via getSession() in layouts, pages, and mutations.
 */
export async function getSessionJwtFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  return decrypt(request.cookies.get('session')?.value);
}

async function loadSessionTokenFromDb(session: string | undefined): Promise<SessionPayload | null> {
  if (!session) return null;

  const payload = await decrypt(session);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true, lastPasswordChange: true },
  });

  if (!user) return null;

  // Reject tokens whose password-change claim does not match the DB (covers admin reset to epoch)
  const tokenPasswordChange = Date.parse(payload.lastPasswordChange);
  if (Number.isNaN(tokenPasswordChange) || tokenPasswordChange !== user.lastPasswordChange.getTime()) {
    return null;
  }

  return {
    userId: payload.userId,
    role: user.role,
    lastPasswordChange: user.lastPasswordChange.toISOString(),
  };
}

/** DB-validated session for request contexts such as Proxy. */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  return loadSessionTokenFromDb(request.cookies.get('session')?.value);
}

async function loadSessionFromDb(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return loadSessionTokenFromDb(cookieStore.get('session')?.value);
}

/** Request-deduped session with DB role + password-change revocation. */
export const getSession = cache(loadSessionFromDb);

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export function isPasswordRotationRequired(lastPasswordChange: string): boolean {
  const lastChange = new Date(lastPasswordChange);
  if (Number.isNaN(lastChange.getTime())) return true;
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return lastChange < ninetyDaysAgo;
}
