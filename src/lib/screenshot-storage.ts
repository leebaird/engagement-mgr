import { lstat, readdir } from 'fs/promises';
import { join } from 'path';
import { pool } from '@/lib/db';

export const MAX_SCREENSHOT_STORAGE_BYTES = 512 * 1024 * 1024;
export const MAX_SCREENSHOT_FILES = 10_000;
export const MAX_SCREENSHOTS_PER_FINDING = 100;
export const UPLOADS_MAINTENANCE_LOCK_ID = 1_394_517_092;

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
