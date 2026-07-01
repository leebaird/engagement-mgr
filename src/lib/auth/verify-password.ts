import * as argon2 from 'argon2';
import { prisma } from '@/lib/db';
import { ARGON2_OPTIONS } from '@/lib/auth/password';
import {
  clearLoginRateLimit,
  isLoginRateLimited,
  loginRateLimitKey,
  recordLoginFailure,
} from '@/lib/auth/login-rate-limit';

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    return false;
  }

  try {
    return await argon2.verify(user.passwordHash, password, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

export type RateLimitedPasswordResult =
  | { ok: true }
  | { ok: false; limited: false }
  | { ok: false; limited: true; retryAfterMinutes: number };

/**
 * Verify a logged-in user's password with brute-force protection, for
 * sensitive confirmations (change password, database restore/reset).
 */
export async function verifyUserPasswordRateLimited(
  userId: string,
  password: string
): Promise<RateLimitedPasswordResult> {
  const key = loginRateLimitKey('confirm', userId);
  const rateLimit = await isLoginRateLimited(key);

  if (rateLimit.limited) {
    return { ok: false, limited: true, retryAfterMinutes: rateLimit.retryAfterMinutes };
  }

  const valid = await verifyUserPassword(userId, password);

  if (!valid) {
    await recordLoginFailure(key);
    return { ok: false, limited: false };
  }

  await clearLoginRateLimit(key);
  return { ok: true };
}