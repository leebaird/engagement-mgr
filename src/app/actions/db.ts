'use server';

import { writeFile } from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { buildPathQuery } from '@/lib/list-view-params';
import {
  backupFilename,
  ensureBackupDirectory,
  formatBackupPathForDisplay,
  resolveBackupFilePath,
} from '@/lib/backup-path';
import {
  deleteAllDatabaseData,
  exportDatabaseArchive,
  importDatabaseArchive,
  importDatabaseSql,
} from '@/lib/db-backup';
import { validatePasswordComplexity } from '@/lib/auth/password';
import { verifyUserPassword } from '@/lib/auth/verify-password';
import { isAdminError, requireAdminAuth } from '@/lib/require-admin';
import { adminConfirmPasswordSchema, validateBackupFile } from '@/lib/validation/db';

function usersListParams(formData: FormData) {
  const sort = formData.get('sort')?.toString();
  const dir = formData.get('dir')?.toString();
  return { sort, dir };
}

export async function exportDatabaseBackup():
  Promise<{ error: string } | { filename: string; savedPath: string; data: number[] }> {
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    return { error: 'Unauthorized' };
  }

  try {
    const zip = await exportDatabaseArchive();
    const filename = backupFilename();
    await ensureBackupDirectory();
    const absolutePath = resolveBackupFilePath(filename);

    if (!absolutePath) {
      return { error: 'Failed to prepare backup file path.' };
    }

    await writeFile(absolutePath, zip);

    return {
      filename,
      savedPath: formatBackupPathForDisplay(absolutePath),
      data: Array.from(zip),
    };
  } catch {
    return {
      error: 'Export failed. Ensure pg_dump and zip are installed and DATABASE_URL is valid.',
    };
  }
}

export async function importDatabaseBackup(formData: FormData): Promise<void> {
  const listParams = usersListParams(formData);
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    redirect(buildPathQuery('/users', listParams, { db: 'restore', dbError: 'unauthorized' }));
  }

  const passwordParsed = adminConfirmPasswordSchema.safeParse(formData.get('password'));
  if (!passwordParsed.success) {
    redirect(buildPathQuery('/users', listParams, { db: 'restore', dbError: 'password' }));
  }

  const passwordValid = await verifyUserPassword(session.userId, passwordParsed.data);
  if (!passwordValid) {
    redirect(buildPathQuery('/users', listParams, { db: 'restore', dbError: 'password' }));
  }

  const fileResult = validateBackupFile(formData.get('file'));
  if (!fileResult.ok) {
    redirect(buildPathQuery('/users', listParams, { db: 'restore', dbError: 'file' }));
  }

  let restoreError = 'generic';

  try {
    const file = fileResult.file;
    const name = file.name.toLowerCase();

    if (name.endsWith('.zip')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await importDatabaseArchive(buffer);
    } else {
      const sql = await file.text();
      if (!sql.trim()) {
        restoreError = 'file';
        throw new Error('Backup SQL file is empty');
      }
      await importDatabaseSql(sql);
    }

    revalidatePath('/', 'layout');
  } catch {
    redirect(buildPathQuery('/users', listParams, { db: 'restore', dbError: restoreError }));
  }

  redirect(buildPathQuery('/users', listParams, { dbMsg: 'restore' }));
}

export async function resetDatabase(formData: FormData): Promise<void> {
  const listParams = usersListParams(formData);
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    redirect(buildPathQuery('/users', listParams, { db: 'reset', dbError: 'unauthorized' }));
  }

  if (formData.get('confirm')?.toString() !== 'RESET') {
    redirect(buildPathQuery('/users', listParams, { db: 'reset', dbError: 'confirm' }));
  }

  const passwordParsed = adminConfirmPasswordSchema.safeParse(formData.get('password'));
  if (!passwordParsed.success) {
    redirect(buildPathQuery('/users', listParams, { db: 'reset', dbError: 'password' }));
  }

  const passwordValid = await verifyUserPassword(session.userId, passwordParsed.data);
  if (!passwordValid) {
    redirect(buildPathQuery('/users', listParams, { db: 'reset', dbError: 'password' }));
  }

  if (!validatePasswordComplexity(passwordParsed.data).valid) {
    redirect(buildPathQuery('/users', listParams, { db: 'reset', dbError: 'passwordPolicy' }));
  }

  try {
    await deleteAllDatabaseData(passwordParsed.data);
    revalidatePath('/', 'layout');
  } catch {
    redirect(buildPathQuery('/users', listParams, { db: 'reset', dbError: 'generic' }));
  }

  redirect('/login');
}
