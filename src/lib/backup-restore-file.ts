import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MAX_BACKUP_BYTES } from '@/lib/validation/db';

export async function readBackupArchiveFile(filePath: string): Promise<Buffer> {
  if (!filePath || filePath.includes('\0')) {
    throw new Error('Provide one backup archive path.');
  }
  const resolvedPath = resolve(filePath);
  let file;
  try {
    file = await open(resolvedPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new Error('Backup archive must be a readable regular file, not a symbolic link.');
  }
  try {
    const stats = await file.stat();
    if (!stats.isFile() || stats.size < 1 || stats.size > MAX_BACKUP_BYTES) {
      throw new Error('Backup archive must be a regular file between 1 byte and 500 MiB.');
    }
    const archive = await file.readFile();
    if (archive.length !== stats.size) {
      throw new Error('Backup archive changed while it was being read.');
    }
    return archive;
  } finally {
    await file.close();
  }
}
