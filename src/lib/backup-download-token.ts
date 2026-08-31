import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { getJwtSecretKey } from '@/lib/jwt-secret';
import { resolveBackupFilePath } from '@/lib/backup-path';

const DOWNLOAD_TOKEN_TTL = '5m';
const DOWNLOAD_TOKEN_PURPOSE = 'backup-download';
export const BACKUP_DOWNLOAD_COOKIE_PATH = '/api/db/backup';
export const BACKUP_DOWNLOAD_TOKEN_TTL_SECONDS = 5 * 60;

export function backupDownloadCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: BACKUP_DOWNLOAD_COOKIE_PATH,
    maxAge: BACKUP_DOWNLOAD_TOKEN_TTL_SECONDS,
    priority: 'high' as const,
  };
}

export function backupDownloadCookieName(filename: string): string {
  const suffix = createHash('sha256').update(filename).digest('hex').slice(0, 20);
  return `backup-download-${suffix}`;
}

export type BackupDownloadTokenPayload = {
  purpose: typeof DOWNLOAD_TOKEN_PURPOSE;
  userId: string;
  filename: string;
};

let encodedKey: Uint8Array | undefined;

function getEncodedKey(): Uint8Array {
  encodedKey ??= getJwtSecretKey();
  return encodedKey;
}

/** Short-lived token authorizing one admin to download a specific backup file. */
export async function createBackupDownloadToken(
  userId: string,
  filename: string
): Promise<string | null> {
  if (!resolveBackupFilePath(filename)) {
    return null;
  }

  return new SignJWT({
    purpose: DOWNLOAD_TOKEN_PURPOSE,
    userId,
    filename,
  } satisfies BackupDownloadTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(DOWNLOAD_TOKEN_TTL)
    .sign(getEncodedKey());
}

export async function verifyBackupDownloadToken(
  token: string,
  userId: string,
  filename: string
): Promise<boolean> {
  if (!token || !resolveBackupFilePath(filename)) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ['HS256'],
    });

    return (
      payload.purpose === DOWNLOAD_TOKEN_PURPOSE &&
      payload.userId === userId &&
      payload.filename === filename
    );
  } catch {
    return false;
  }
}
