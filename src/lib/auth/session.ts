import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getJwtSecretKey } from '@/lib/jwt-secret';
import { prisma } from '@/lib/db';

let encodedKey: Uint8Array | undefined;
export const MAX_ACTIVE_SESSIONS_PER_USER = 10;

export function selectSessionIdsToRetire(activeSessionIds: readonly string[]): string[] {
  return activeSessionIds.slice(
    0,
    Math.max(0, activeSessionIds.length - MAX_ACTIVE_SESSIONS_PER_USER + 1)
  );
}

function getEncodedKey(): Uint8Array {
  encodedKey ??= getJwtSecretKey();
  return encodedKey;
}

export interface SessionPayload {
  sessionId: string;
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

export async function createSession(payload: Omit<SessionPayload, 'sessionId'>) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sessionPayload = { ...payload, sessionId: randomUUID() };
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sessions:${sessionPayload.userId}`}))`;
    await tx.session.deleteMany({
      where: { userId: sessionPayload.userId, expiresAt: { lte: new Date() } },
    });
    const activeSessions = await tx.session.findMany({
      where: { userId: sessionPayload.userId },
      select: { id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const retire = selectSessionIdsToRetire(
      activeSessions.map((session) => session.id)
    );
    if (retire.length) {
      await tx.session.deleteMany({
        where: { id: { in: retire } },
      });
    }
    await tx.session.create({
      data: {
        id: sessionPayload.sessionId,
        userId: sessionPayload.userId,
        expiresAt,
      },
    });
  });
  const session = await encrypt(sessionPayload);

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
  if (
    !payload ||
    typeof payload.sessionId !== 'string' ||
    typeof payload.userId !== 'string' ||
    typeof payload.lastPasswordChange !== 'string'
  )
    return null;

  const activeSession = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    select: {
      userId: true,
      expiresAt: true,
      user: { select: { role: true, lastPasswordChange: true } },
    },
  });

  if (
    !activeSession ||
    activeSession.userId !== payload.userId ||
    activeSession.expiresAt.getTime() <= Date.now()
  )
    return null;
  const user = activeSession.user;

  // Reject tokens whose password-change claim does not match the DB (covers admin reset to epoch)
  const tokenPasswordChange = Date.parse(payload.lastPasswordChange);
  if (Number.isNaN(tokenPasswordChange) || tokenPasswordChange !== user.lastPasswordChange.getTime()) {
    return null;
  }

  return {
    sessionId: payload.sessionId,
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
  const payload = await decrypt(cookieStore.get('session')?.value);
  if (
    payload &&
    typeof payload.sessionId === 'string' &&
    typeof payload.userId === 'string'
  ) {
    await prisma.session.deleteMany({
      where: { id: payload.sessionId, userId: payload.userId },
    });
  }
  cookieStore.delete('session');
}

export function isPasswordRotationRequired(lastPasswordChange: string): boolean {
  const lastChange = new Date(lastPasswordChange);
  if (Number.isNaN(lastChange.getTime())) return true;
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return lastChange < ninetyDaysAgo;
}
