import { homedir } from 'os';
import { basename, join, resolve } from 'path';
import { chmod, mkdir } from 'fs/promises';

export const BACKUP_DIR_NAME = 'engagement-mgr-backups';

export function getBackupDirectory(): string {
  return join(homedir(), BACKUP_DIR_NAME);
}

export function formatBackupPathForDisplay(absolutePath: string): string {
  const home = homedir();
  if (absolutePath.startsWith(home)) {
    return `~${absolutePath.slice(home.length)}`;
  }
  return absolutePath;
}

export function backupFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp =
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-') +
    '-' +
    [pad(now.getHours()), pad(now.getMinutes())].join('-');
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

  if (!/^em-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/.test(safeName)) {
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
