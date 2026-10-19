import { randomUUID } from 'crypto';
import { chmod, lstat, mkdir, readdir } from 'fs/promises';
import { basename, relative, resolve, sep } from 'path';

export function resolveUploadsDirectory(
  setting: string | undefined,
  appRoot: string = process.cwd()
): string {
  // Relative values resolve from the application root.
  const directory = resolve(appRoot, setting?.trim() || 'uploads');
  // The app root, its parents and the filesystem root would expose unrelated files to cleanup.
  if (relative(directory, appRoot).split(sep)[0] !== '..') {
    throw new Error('UPLOADS_DIR must be a dedicated folder, not the application folder or one of its parents.');
  }
  return directory;
}

const UPLOADS_DIR = resolveUploadsDirectory(process.env.UPLOADS_DIR);

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
    const paths = (await readdir(UPLOADS_DIR)).map((name) => resolve(UPLOADS_DIR, name));
    // Check every entry before changing any permissions.
    for (const path of paths) {
      if (!(await lstat(path)).isFile()) {
        throw new Error('Uploads directory contains an unsupported entry');
      }
    }
    for (const path of paths) await chmod(path, 0o600);
    return UPLOADS_DIR;
  })().catch((error) => {
    securedUploadsDirectory = undefined;
    throw error;
  });
  return securedUploadsDirectory;
}
