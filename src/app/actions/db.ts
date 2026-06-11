'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  deleteAllDatabaseData,
  exportDatabaseArchive,
  importDatabaseArchive,
  importDatabaseSql,
} from '@/lib/db-backup';
import { requireAdmin } from '@/lib/require-admin';

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
  const session = await requireAdmin();
  if (!session) {
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
  const session = await requireAdmin();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return { error: 'No backup file provided' };
    }

    const name = file.name.toLowerCase();

    if (name.endsWith('.zip')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await importDatabaseArchive(buffer);
    } else if (name.endsWith('.sql')) {
      const sql = await file.text();
      if (!sql.trim()) {
        return { error: 'Backup file is empty' };
      }
      await importDatabaseSql(sql);
    } else {
      return {
        error: 'Use a .zip full backup from Backup, or a .sql database-only file',
      };
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

export async function resetDatabase(): Promise<{ error?: string }> {
  const session = await requireAdmin();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    await deleteAllDatabaseData();
    revalidatePath('/', 'layout');
  } catch {
    return { error: 'Reset failed.' };
  }

  redirect('/login');
}