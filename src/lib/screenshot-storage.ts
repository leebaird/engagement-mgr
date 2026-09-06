import { lstat, readdir, rename, unlink } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { pool, prisma } from '@/lib/db';
import { ensureUploadsDirectory } from '@/lib/uploads-path';

export const MAX_SCREENSHOT_STORAGE_BYTES = 512 * 1024 * 1024;
export const MAX_SCREENSHOT_FILES = 10_000;
export const MAX_SCREENSHOTS_PER_FINDING = 100;
export const UPLOADS_MAINTENANCE_LOCK_ID = 1_394_517_092;

const SCREENSHOT_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg)$/i;
const PENDING_DELETE_PREFIX = '.pending-delete-';
const TEMPORARY_UPLOAD_PATTERN =
  /^\.[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg)\.tmp$/i;
let reconciliationRequired = true;
let reconciliationPromise: Promise<void> | undefined;

type MaintenanceLockClient = {
  query(
    query: string,
    values: unknown[]
  ): Promise<{ rows?: Array<{ locked?: boolean }> }>;
  release(error?: Error): void;
};

type MaintenanceLockPool = {
  connect(): Promise<MaintenanceLockClient>;
};

export async function withUploadsMaintenanceLock<T>(
  operation: () => Promise<T>,
  databasePool: MaintenanceLockPool = pool
): Promise<T> {
  const client = await databasePool.connect();
  let acquired = false;
  let failed = false;
  let operationError: unknown;
  let result: T | undefined;
  try {
    const lockResult = await client.query(
      'SELECT pg_try_advisory_lock($1::integer) AS locked',
      [UPLOADS_MAINTENANCE_LOCK_ID]
    );
    if (lockResult.rows?.[0]?.locked !== true) {
      throw new Error('Uploads are temporarily unavailable during database maintenance');
    }
    acquired = true;
    result = await operation();
  } catch (error) {
    failed = true;
    operationError = error;
  }

  let releaseError: Error | undefined;
  if (acquired) {
    try {
      await client.query('SELECT pg_advisory_unlock($1::integer)', [
        UPLOADS_MAINTENANCE_LOCK_ID,
      ]);
    } catch (error) {
      releaseError = error instanceof Error ? error : new Error('Failed to release uploads lock');
    }
  }
  client.release(releaseError);

  if (failed) throw operationError;
  if (releaseError) throw releaseError;
  return result as T;
}

export class ScreenshotQuotaError extends Error {
  constructor() {
    super('Screenshot storage quota reached. Delete an existing screenshot before uploading.');
    this.name = 'ScreenshotQuotaError';
  }
}

export type StagedScreenshotDeletion = {
  originalPath: string;
  stagedPath: string;
};

export async function stageScreenshotDeletion(
  filePath: string
): Promise<StagedScreenshotDeletion | null> {
  const fileName = basename(filePath);
  if (!SCREENSHOT_FILENAME_PATTERN.test(fileName)) {
    throw new Error('Screenshot filename is invalid');
  }

  const stagedPath = join(dirname(filePath), `${PENDING_DELETE_PREFIX}${fileName}`);
  try {
    await rename(filePath, stagedPath);
    reconciliationRequired = true;
    return { originalPath: filePath, stagedPath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function restoreStagedScreenshotDeletion(
  deletion: StagedScreenshotDeletion
): Promise<void> {
  await rename(deletion.stagedPath, deletion.originalPath);
}

export async function finishStagedScreenshotDeletion(
  deletion: StagedScreenshotDeletion
): Promise<void> {
  try {
    await unlink(deletion.stagedPath);
  } catch (error) {
    reconciliationRequired = true;
    throw error;
  }
}

export async function reconcileScreenshotFiles(
  uploadsDirectory: string,
  referencedFiles: ReadonlySet<string>
): Promise<void> {
  const present = new Set<string>();
  const entries = await readdir(uploadsDirectory, { withFileTypes: true });
  const existingNames = new Set(entries.map((entry) => entry.name));

  for (const fileName of referencedFiles) {
    if (!SCREENSHOT_FILENAME_PATTERN.test(fileName) || basename(fileName) !== fileName) {
      throw new Error('Database contains an invalid screenshot filename');
    }
  }

  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue;
    if (!entry.isFile()) {
      throw new Error('Uploads directory contains an unsupported entry');
    }

    const filePath = join(uploadsDirectory, entry.name);
    if (TEMPORARY_UPLOAD_PATTERN.test(entry.name)) {
      await unlink(filePath);
      continue;
    }

    if (entry.name.startsWith(PENDING_DELETE_PREFIX)) {
      const originalName = entry.name.slice(PENDING_DELETE_PREFIX.length);
      if (!SCREENSHOT_FILENAME_PATTERN.test(originalName)) {
        throw new Error('Uploads directory contains an unsupported file');
      }
      if (referencedFiles.has(originalName)) {
        if (existingNames.has(originalName)) {
          await unlink(filePath);
        } else {
          await rename(filePath, join(uploadsDirectory, originalName));
        }
        present.add(originalName);
      } else {
        await unlink(filePath);
      }
      continue;
    }

    if (!SCREENSHOT_FILENAME_PATTERN.test(entry.name)) {
      throw new Error('Uploads directory contains an unsupported file');
    }
    if (referencedFiles.has(entry.name)) {
      present.add(entry.name);
    } else {
      await unlink(filePath);
    }
  }

  for (const fileName of referencedFiles) {
    if (!present.has(fileName)) {
      throw new Error(`Screenshot file is missing: ${fileName}`);
    }
  }
}

export async function reconcileScreenshotStorage(uploadsDirectory: string): Promise<Set<string>> {
  const screenshots = await prisma.screenshot.findMany({ select: { filePath: true } });
  const referencedFiles = new Set(screenshots.map((screenshot) => screenshot.filePath));
  await reconcileScreenshotFiles(uploadsDirectory, referencedFiles);
  reconciliationRequired = false;
  return referencedFiles;
}

export async function ensureReconciledScreenshotStorage(): Promise<void> {
  if (!reconciliationRequired) return;
  reconciliationPromise ??= withUploadsMaintenanceLock(async () => {
    const uploadsDirectory = await ensureUploadsDirectory();
    await reconcileScreenshotStorage(uploadsDirectory);
  }).finally(() => {
    reconciliationPromise = undefined;
  });
  return reconciliationPromise;
}

export function assertScreenshotQuota(options: {
  storedBytes: number;
  storedFiles: number;
  findingFiles: number;
  uploadBytes: number;
}): void {
  if (
    options.storedBytes + options.uploadBytes > MAX_SCREENSHOT_STORAGE_BYTES ||
    options.storedFiles + 1 > MAX_SCREENSHOT_FILES ||
    options.findingFiles + 1 > MAX_SCREENSHOTS_PER_FINDING
  ) {
    throw new ScreenshotQuotaError();
  }
}

export async function getScreenshotStorageUsage(
  uploadsDirectory: string
): Promise<{ storedBytes: number; storedFiles: number }> {
  let storedBytes = 0;
  let storedFiles = 0;

  for (const entry of await readdir(uploadsDirectory, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') {
      continue;
    }
    if (!entry.isFile()) {
      throw new ScreenshotQuotaError();
    }
    const stats = await lstat(join(uploadsDirectory, entry.name));
    storedBytes += stats.size;
    storedFiles += 1;
  }

  return { storedBytes, storedFiles };
}
