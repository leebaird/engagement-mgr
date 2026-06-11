import { basename, join, resolve } from 'path';

const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

export function resolveUploadFilePath(filename: string): string | null {
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

  const filePath = resolve(UPLOADS_DIR, safeName);
  if (!filePath.startsWith(UPLOADS_DIR + '/') && filePath !== UPLOADS_DIR) {
    return null;
  }

  return filePath;
}