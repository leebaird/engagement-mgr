import { randomUUID } from 'crypto';
import { chmod, lstat, mkdir, readdir } from 'fs/promises';
import { basename, resolve } from 'path';

const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

const ALLOWED_UPLOAD_EXTENSIONS = new Set(['png', 'jpg']);
let securedUploadsDirectory: Promise<string> | undefined;

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

export function getUploadsDirectory(): string {
  return UPLOADS_DIR;
}

export async function ensureUploadsDirectory(): Promise<string> {
  securedUploadsDirectory ??= (async () => {
    await mkdir(UPLOADS_DIR, { recursive: true, mode: 0o700 });
    await chmod(UPLOADS_DIR, 0o700);
    for (const entry of await readdir(UPLOADS_DIR, { withFileTypes: true })) {
      const path = resolve(UPLOADS_DIR, entry.name);
      const stats = await lstat(path);
      if (!stats.isFile()) {
        throw new Error('Uploads directory contains an unsupported entry');
      }
      await chmod(path, 0o600);
    }
    return UPLOADS_DIR;
  })().catch((error) => {
    securedUploadsDirectory = undefined;
    throw error;
  });
  return securedUploadsDirectory;
}
