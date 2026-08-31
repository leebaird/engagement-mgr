import { prisma } from '@/lib/db';
import { verifyPasswordHash } from '@/lib/auth/password';
import {
  clearRateLimit,
  consumeRateLimitAttempt,
  LOGIN_RATE_LIMITS,
  passwordConfirmationRateLimitKey,
} from '@/lib/auth/login-rate-limit';

export async function verifyUserPassword(
  userId: string,
  password: string
): Promise<'verified' | 'invalid' | 'busy'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    return 'invalid';
  }

  try {
    return await verifyPasswordHash(user.passwordHash, password);
  } catch {
    return 'invalid';
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
  const key = passwordConfirmationRateLimitKey(userId);
  const rateLimit = await consumeRateLimitAttempt(key, LOGIN_RATE_LIMITS.confirmation);

  if (!rateLimit.allowed) {
    return { ok: false, limited: true, retryAfterMinutes: rateLimit.retryAfterMinutes };
  }

  const verification = await verifyUserPassword(userId, password);

  if (verification === 'busy') {
    return { ok: false, limited: true, retryAfterMinutes: 1 };
  }
  if (verification === 'invalid') {
    return { ok: false, limited: false };
  }

  await clearRateLimit(key);
  return { ok: true };
}
