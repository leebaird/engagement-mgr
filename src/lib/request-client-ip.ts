import { headers } from 'next/headers';

/**
 * When the app sits behind a reverse proxy that overwrites client IP headers,
 * set TRUST_PROXY=1 (or true/yes). Without that, X-Forwarded-For / X-Real-IP
 * are ignored so clients cannot bypass rate limits by spoofing those headers.
 */
export function isTrustProxyEnabled(env: NodeJS.Dict<string> = process.env): boolean {
  const value = env.TRUST_PROXY?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

/** Pure helper for tests and for getClientIp(). */
export function resolveClientIp(options: {
  trustProxy: boolean;
  forwardedFor: string | null;
  realIp: string | null;
}): string {
  if (!options.trustProxy) {
    return 'direct';
  }

  if (options.forwardedFor) {
    return options.forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return options.realIp?.trim() || 'unknown';
}

export async function getClientIp(): Promise<string> {
  if (!isTrustProxyEnabled()) {
    return 'direct';
  }

  const requestHeaders = await headers();
  return resolveClientIp({
    trustProxy: true,
    forwardedFor: requestHeaders.get('x-forwarded-for'),
    realIp: requestHeaders.get('x-real-ip'),
  });
}
