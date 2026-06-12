const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, RateLimitEntry>();

export function loginRateLimitKey(ip: string, username: string): string {
  return `${ip}:${username.toLowerCase()}`;
}

export function isLoginRateLimited(
  key: string
): { limited: false } | { limited: true; retryAfterMinutes: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    return { limited: false };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      limited: true,
      retryAfterMinutes: Math.max(1, Math.ceil((entry.resetAt - now) / 60_000)),
    };
  }

  return { limited: false };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count += 1;
}

export function clearLoginRateLimit(key: string): void {
  attempts.delete(key);
}