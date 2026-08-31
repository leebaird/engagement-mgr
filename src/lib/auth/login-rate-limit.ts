import { prisma } from '@/lib/db';

const WINDOW_MS = 15 * 60 * 1000;

export const LOGIN_RATE_LIMITS = {
  source: { maxAttempts: 30, windowMs: WINDOW_MS },
  confirmation: { maxAttempts: 5, windowMs: WINDOW_MS },
} as const;

type RateLimitClient = Pick<typeof prisma, '$queryRawUnsafe'>;

type RateLimitOptions = {
  maxAttempts: number;
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMinutes: number };

export function sourceLoginRateLimitKey(clientIp: string): string {
  return `login:source:${clientIp}`;
}

export function passwordConfirmationRateLimitKey(userId: string): string {
  return `password-confirmation:${userId}`;
}

export async function consumeRateLimitAttempt(
  key: string,
  options: RateLimitOptions,
  client: RateLimitClient = prisma
): Promise<RateLimitResult> {
  const now = new Date();
  const nextResetAt = new Date(now.getTime() + options.windowMs);
  const rows = await client.$queryRawUnsafe<Array<{ count: number; resetAt: Date }>>(
    `
      WITH expired AS (
        DELETE FROM "LoginRateLimit"
        WHERE "resetAt" <= $3 AND "key" <> $1
      )
      INSERT INTO "LoginRateLimit" ("key", "count", "resetAt")
      VALUES ($1, 1, $2)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "LoginRateLimit"."resetAt" <= $3 THEN 1
          ELSE "LoginRateLimit"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "LoginRateLimit"."resetAt" <= $3 THEN $2
          ELSE "LoginRateLimit"."resetAt"
        END
      RETURNING "count", "resetAt"
    `,
    key,
    nextResetAt,
    now
  );
  const reservation = rows[0];
  if (!reservation) {
    throw new Error('Rate-limit reservation failed');
  }

  if (reservation.count <= options.maxAttempts) {
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterMinutes: Math.max(
      1,
      Math.ceil((reservation.resetAt.getTime() - now.getTime()) / 60_000)
    ),
  };
}

export async function clearRateLimit(key: string): Promise<void> {
  await prisma.loginRateLimit.delete({ where: { key } }).catch(() => {});
}
