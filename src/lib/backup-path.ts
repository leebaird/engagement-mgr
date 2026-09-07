import { basename, resolve } from 'path';
import { chmod, mkdir } from 'fs/promises';

export const BACKUP_DIR_NAME = 'backups';

const BACKUP_FILENAME_RE = /^em-backup-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/;

export function getBackupDirectory(): string {
  return resolve(process.cwd(), BACKUP_DIR_NAME);
}

export function formatBackupPathForDisplay(absolutePath: string): string {
  const cwd = resolve(process.cwd());
  const resolved = resolve(absolutePath);
  if (resolved === cwd) return '.';
  if (resolved.startsWith(`${cwd}/`)) {
    return resolved.slice(cwd.length + 1);
  }
  return absolutePath;
}

export function backupFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp =
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-') +
    '-' +
    `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `em-backup-${timestamp}.zip`;
}

export function resolveBackupFilePath(filename: string): string | null {
  if (!filename || filename.includes('\0')) {
    return null;
  }

  const safeName = basename(filename);
  if (!safeName || safeName === '.' || safeName === '..') {
    return null;
  }

  if (safeName !== filename) {
    return null;
  }

  if (!BACKUP_FILENAME_RE.test(safeName)) {
    return null;
  }

  const backupDir = resolve(getBackupDirectory());
  const filePath = resolve(backupDir, safeName);

  if (!filePath.startsWith(`${backupDir}/`)) {
    return null;
  }

  return filePath;
}

export async function ensureBackupDirectory(): Promise<string> {
  const dir = getBackupDirectory();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  return dir;
}
