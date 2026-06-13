'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  deleteAllDatabaseData,
  exportDatabaseArchive,
  importDatabaseArchive,
  importDatabaseSql,
} from '@/lib/db-backup';
import { verifyUserPassword } from '@/lib/auth/verify-password';
import { isAdminError, requireAdminAuth } from '@/lib/require-admin';
import { adminConfirmPasswordSchema, validateBackupFile } from '@/lib/validation/db';
import { firstZodError } from '@/lib/validation/common';

function backupFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp =
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-') +
    '-' +
    [pad(now.getHours()), pad(now.getMinutes())].join('-');
  return `em-backup-${timestamp}.zip`;
}

export async function exportDatabaseBackup():
  Promise<{ error: string } | { filename: string; data: number[] }> {
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    return { error: 'Unauthorized' };
  }

  try {
    const zip = await exportDatabaseArchive();
    return { filename: backupFilename(), data: Array.from(zip) };
  } catch {
    return {
      error: 'Export failed. Ensure pg_dump and zip are installed and DATABASE_URL is valid.',
    };
  }
}

export async function importDatabaseBackup(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    return { error: 'Unauthorized' };
  }

  const passwordParsed = adminConfirmPasswordSchema.safeParse(formData.get('password'));
  if (!passwordParsed.success) {
    return { error: firstZodError(passwordParsed.error) };
  }

  const passwordValid = await verifyUserPassword(session.userId, passwordParsed.data);
  if (!passwordValid) {
    return { error: 'Incorrect password.' };
  }

  try {
    const fileResult = validateBackupFile(formData.get('file'));
    if (!fileResult.ok) {
      return { error: fileResult.error };
    }

    const file = fileResult.file;
    const name = file.name.toLowerCase();

    if (name.endsWith('.zip')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await importDatabaseArchive(buffer);
    } else {
      const sql = await file.text();
      if (!sql.trim()) {
        return { error: 'Backup file is empty' };
      }
      await importDatabaseSql(sql);
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch {
    return {
      error:
        'Restore failed. Use a backup from Backup (.zip), or ensure psql/unzip are installed and the file is valid.',
    };
  }
}

export async function resetDatabase(formData: FormData): Promise<{ error?: string }> {
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    return { error: 'Unauthorized' };
  }

  const passwordParsed = adminConfirmPasswordSchema.safeParse(formData.get('password'));
  if (!passwordParsed.success) {
    return { error: firstZodError(passwordParsed.error) };
  }

  const passwordValid = await verifyUserPassword(session.userId, passwordParsed.data);
  if (!passwordValid) {
    return { error: 'Incorrect password.' };
  }

  try {
    await deleteAllDatabaseData();
    revalidatePath('/', 'layout');
  } catch {
    return { error: 'Reset failed.' };
  }

  redirect('/login');
}