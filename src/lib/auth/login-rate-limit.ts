import { prisma } from '@/lib/db';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function loginRateLimitKey(ip: string, username: string): string {
  return `${ip}:${username.toLowerCase()}`;
}

export async function isLoginRateLimited(
  key: string
): Promise<{ limited: false } | { limited: true; retryAfterMinutes: number }> {
  const now = Date.now();
  const entry = await prisma.loginRateLimit.findUnique({ where: { key } });

  if (!entry || now >= entry.resetAt.getTime()) {
    if (entry) {
      await prisma.loginRateLimit.delete({ where: { key } }).catch(() => {});
    }
    return { limited: false };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      limited: true,
      retryAfterMinutes: Math.max(1, Math.ceil((entry.resetAt.getTime() - now) / 60_000)),
    };
  }

  return { limited: false };
}

export async function recordLoginFailure(key: string): Promise<void> {
  const now = Date.now();
  const entry = await prisma.loginRateLimit.findUnique({ where: { key } });

  if (!entry || now >= entry.resetAt.getTime()) {
    await prisma.loginRateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now + WINDOW_MS) },
      update: { count: 1, resetAt: new Date(now + WINDOW_MS) },
    });
    return;
  }

  await prisma.loginRateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
}

export async function clearLoginRateLimit(key: string): Promise<void> {
  await prisma.loginRateLimit.delete({ where: { key } }).catch(() => {});
}