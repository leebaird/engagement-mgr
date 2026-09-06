'use server';

import { writeFile } from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildPathQuery } from '@/lib/list-view-params';
import {
  backupFilename,
  ensureBackupDirectory,
  resolveBackupFilePath,
} from '@/lib/backup-path';
import {
  deleteAllDatabaseData,
  exportDatabaseArchive,
  importDatabaseArchive,
} from '@/lib/db-backup';
import { validatePasswordComplexity } from '@/lib/auth/password';
import { verifyUserPasswordRateLimited } from '@/lib/auth/verify-password';
import {
  backupDownloadCookieOptions,
  backupDownloadCookieName,
  createBackupDownloadToken,
} from '@/lib/backup-download-token';
import { logAuditEvent } from '@/lib/audit-log';
import { isAdminError, requireAdminAuth } from '@/lib/require-admin';
import { adminConfirmPasswordSchema, validateBackupFile } from '@/lib/validation/db';

function usersListParams(formData: FormData) {
  const sort = formData.get('sort')?.toString();
  const dir = formData.get('dir')?.toString();
  const tab = formData.get('tab')?.toString();
  return { sort, dir, tab };
}

/**
 * Create a full backup after admin password re-confirmation.
 * Writes to ~/engagement-mgr-backups/ and redirects with a download link param.
 */
export async function exportDatabaseBackup(formData: FormData): Promise<void> {
  const listParams = usersListParams(formData);
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'backup', dbError: 'unauthorized' }));
  }

  const passwordParsed = adminConfirmPasswordSchema.safeParse(formData.get('password'));
  if (!passwordParsed.success) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'backup', dbError: 'password' }));
  }

  const passwordResult = await verifyUserPasswordRateLimited(session.userId, passwordParsed.data);
  if (!passwordResult.ok) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'backup', dbError: 'password' }));
  }

  let exportedFilename: string | null = null;
  try {
    const zip = await exportDatabaseArchive();
    const filename = backupFilename();
    await ensureBackupDirectory();
    const absolutePath = resolveBackupFilePath(filename);

    if (!absolutePath) {
      throw new Error('Failed to prepare backup file path.');
    }

    await writeFile(absolutePath, zip, { flag: 'wx', mode: 0o600 });
    const token = await createBackupDownloadToken(session.userId, filename);
    if (!token) {
      throw new Error('Failed to prepare backup download token.');
    }
    (await cookies()).set(
      backupDownloadCookieName(filename),
      token,
      backupDownloadCookieOptions()
    );
    exportedFilename = filename;
  } catch {
    await logAuditEvent('db.export', session.userId, 'failure');
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'backup', dbError: 'generic' }));
  }

  await logAuditEvent('db.export', session.userId, 'success');
  redirect(
    buildPathQuery('/dashboard/users', listParams, {
      dbMsg: 'backup',
      backupFile: exportedFilename,
      db: null,
      dbError: null,
    })
  );
}

export async function importDatabaseBackup(formData: FormData): Promise<void> {
  const listParams = usersListParams(formData);
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'restore', dbError: 'unauthorized' }));
  }

  const passwordParsed = adminConfirmPasswordSchema.safeParse(formData.get('password'));
  if (!passwordParsed.success) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'restore', dbError: 'password' }));
  }

  const passwordResult = await verifyUserPasswordRateLimited(session.userId, passwordParsed.data);
  if (!passwordResult.ok) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'restore', dbError: 'password' }));
  }

  const fileResult = validateBackupFile(formData.get('file'));
  if (!fileResult.ok) {
    const dbError = fileResult.error.startsWith('This backup is too large')
      ? 'large'
      : 'file';
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'restore', dbError }));
  }

  let restoreError = 'generic';

  try {
    const buffer = Buffer.from(await fileResult.file.arrayBuffer());
    await importDatabaseArchive(buffer);

    revalidatePath('/', 'layout');
  } catch {
    await logAuditEvent('db.restore', session.userId, 'failure');
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'restore', dbError: restoreError }));
  }

  await logAuditEvent('db.restore', session.userId, 'success');
  redirect(buildPathQuery('/dashboard/users', listParams, { dbMsg: 'restore' }));
}

export async function resetDatabase(formData: FormData): Promise<void> {
  const listParams = usersListParams(formData);
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'reset', dbError: 'unauthorized' }));
  }

  if (formData.get('confirm')?.toString() !== 'RESET') {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'reset', dbError: 'confirm' }));
  }

  const passwordParsed = adminConfirmPasswordSchema.safeParse(formData.get('password'));
  if (!passwordParsed.success) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'reset', dbError: 'password' }));
  }

  const passwordResult = await verifyUserPasswordRateLimited(session.userId, passwordParsed.data);
  if (!passwordResult.ok) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'reset', dbError: 'password' }));
  }

  if (!validatePasswordComplexity(passwordParsed.data).valid) {
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'reset', dbError: 'passwordPolicy' }));
  }

  try {
    await deleteAllDatabaseData(passwordParsed.data);
    revalidatePath('/', 'layout');
  } catch {
    await logAuditEvent('db.reset', session.userId, 'failure');
    redirect(buildPathQuery('/dashboard/users', listParams, { db: 'reset', dbError: 'generic' }));
  }

  await logAuditEvent('db.reset', session.userId, 'success');
  redirect('/login');
}
