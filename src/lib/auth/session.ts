import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
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

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  const payload = await decrypt(session);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true, lastPasswordChange: true },
  });

  if (!user) return null;

  // Reject tokens issued before the user's last password change (revocation)
  const tokenPasswordChange = Date.parse(payload.lastPasswordChange);
  if (Number.isNaN(tokenPasswordChange) || tokenPasswordChange < user.lastPasswordChange.getTime()) {
    return null;
  }

  return {
    userId: payload.userId,
    role: user.role,
    lastPasswordChange: user.lastPasswordChange.toISOString(),
  };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
