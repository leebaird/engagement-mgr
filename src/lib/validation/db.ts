import { z } from 'zod';

import { MAX_PASSWORD_LENGTH } from '@/lib/auth/password';

export const MAX_BACKUP_BYTES = 500 * 1024 * 1024;
export const MAX_BROWSER_BACKUP_BYTES = 8 * 1024 * 1024;

export const adminConfirmPasswordSchema = z
  .string()
  .min(1, 'Password confirmation is required.')
  .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);

export function validateBackupFile(
  file: unknown
): { ok: true; file: File } | { ok: false; error: string } {
  if (!file || typeof file === 'string' || !(file instanceof File)) {
    return { ok: false, error: 'No backup file provided' };
  }

  const backupFile = file;

  const parsed = z
    .object({
      name: z
        .string()
        .min(1)
        .refine(
          (name) => {
            const lower = name.toLowerCase();
            return lower.endsWith('.zip');
          },
          {
            message: 'Use a .zip file created by Engagement Manager Backup',
          }
        ),
      size: z
        .number()
        .int()
        .positive('Backup file is empty')
        .max(
          MAX_BROWSER_BACKUP_BYTES,
          'This backup is too large for browser restore. Use npm run db:restore -- /path/to/backup.zip on the application server.'
        ),
    })
    .safeParse({ name: backupFile.name, size: backupFile.size });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid backup file' };
  }

  return { ok: true, file: backupFile };
}
