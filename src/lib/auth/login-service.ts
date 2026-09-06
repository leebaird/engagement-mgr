import { prisma } from '@/lib/db';
import {
  consumeLoginRateLimitAttempt,
  releaseLoginRateLimitAttempt,
} from '@/lib/auth/login-rate-limit';
import { verifyAgainstDummyHash, verifyPasswordHash } from '@/lib/auth/password';

export type LoginResult =
  | {
      status: 'authenticated';
      userId: string;
      role: 'Admin' | 'User';
      lastPasswordChange: Date;
      needsPasswordChange: boolean;
    }
  | { status: 'invalid' | 'busy' }
  | { status: 'limited'; retryAfterMinutes: number };

export async function authenticateLogin(
  clientIp: string,
  username: string,
  password: string
): Promise<LoginResult> {
  const rateLimit = await consumeLoginRateLimitAttempt(clientIp, username);
  if (!rateLimit.allowed) {
    return { status: 'limited', retryAfterMinutes: rateLimit.retryAfterMinutes };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const dummyVerification = await verifyAgainstDummyHash(password);
    return { status: dummyVerification === 'busy' ? 'busy' : 'invalid' };
  }

  const passwordResult = await verifyPasswordHash(user.passwordHash, password);
  if (passwordResult === 'busy') return { status: 'busy' };
  if (passwordResult === 'invalid') return { status: 'invalid' };

  await releaseLoginRateLimitAttempt(clientIp, username);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return {
    status: 'authenticated',
    userId: user.id,
    role: user.role,
    lastPasswordChange: user.lastPasswordChange,
    needsPasswordChange: user.lastPasswordChange < ninetyDaysAgo,
  };
}
