import { randomUUID } from 'crypto';
import { basename, resolve } from 'path';

const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

const ALLOWED_UPLOAD_EXTENSIONS = new Set(['png', 'jpg', 'gif', 'webp']);

function isPathInsideUploads(filePath: string): boolean {
  return filePath.startsWith(UPLOADS_DIR + '/') || filePath === UPLOADS_DIR;
}

export function createUploadFilePath(
  extension: string
): { absolutePath: string; fileName: string } | null {
  const normalized = extension.toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(normalized)) {
    return null;
  }

  const fileName = `${randomUUID()}.${normalized}`;
  const absolutePath = resolve(UPLOADS_DIR, fileName);

  if (!isPathInsideUploads(absolutePath)) {
    return null;
  }

  return { absolutePath, fileName };
}

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