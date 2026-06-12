import { headers } from 'next/headers';

export async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return requestHeaders.get('x-real-ip')?.trim() || 'unknown';
}