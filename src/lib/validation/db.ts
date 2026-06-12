import { z } from 'zod';

export const MAX_BACKUP_BYTES = 500 * 1024 * 1024;

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
            return lower.endsWith('.zip') || lower.endsWith('.sql');
          },
          {
            message:
              'Use a .zip full backup from Backup, or a .sql database-only file',
          }
        ),
      size: z
        .number()
        .int()
        .positive('Backup file is empty')
        .max(MAX_BACKUP_BYTES, 'Backup file is too large'),
    })
    .safeParse({ name: backupFile.name, size: backupFile.size });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid backup file' };
  }

  return { ok: true, file: backupFile };
}