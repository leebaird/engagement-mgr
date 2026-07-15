import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/jwt-secret';
import { resolveBackupFilePath } from '@/lib/backup-path';

const DOWNLOAD_TOKEN_TTL = '5m';
const DOWNLOAD_TOKEN_PURPOSE = 'backup-download';

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
