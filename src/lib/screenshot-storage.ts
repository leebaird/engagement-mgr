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
const RECONCILIATION_RETRY_DELAY_MS = 60_000;
let reconciliationRetryAt = 0;
let reconciliationError: unknown;

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

export class UploadsLockBusyError extends Error {
  constructor() {
    super('Uploads are temporarily unavailable during database maintenance');
    this.name = 'UploadsLockBusyError';
  }
}

export const UPLOADS_LOCK_WAIT_MS = 10_000;
const UPLOADS_LOCK_RETRY_MS = 100;

type LockTurn = { start: () => void; timer?: NodeJS.Timeout };
const lockTurns: LockTurn[] = [];
let lockTurnTaken = false;

/** Requests in this process take the database lock one at a time, in arrival order. */
function takeLockTurn(deadline: number): Promise<void> {
  if (!lockTurnTaken) {
    lockTurnTaken = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const turn: LockTurn = {
      start: () => {
        clearTimeout(turn.timer);
        resolve();
      },
    };
    turn.timer = setTimeout(() => {
      lockTurns.splice(lockTurns.indexOf(turn), 1);
      reject(new UploadsLockBusyError());
    }, Math.max(0, deadline - Date.now()));
    lockTurns.push(turn);
  });
}

function passLockTurn(): void {
  const next = lockTurns.shift();
  if (next) next.start();
  else lockTurnTaken = false;
}

/**
 * Run `operation` while holding the exclusive uploads lock, waiting up to `waitMs`
 * for it. Requests in this process queue in arrival order; contention from another
 * process (such as the offline restore) is retried with the pool connection returned
 * between attempts, so waiting cannot starve the lock holder's Prisma queries.
 */
export async function withUploadsMaintenanceLock<T>(
  operation: () => Promise<T>,
  databasePool: MaintenanceLockPool = pool,
  { waitMs = UPLOADS_LOCK_WAIT_MS }: { waitMs?: number } = {}
): Promise<T> {
  const deadline = Date.now() + waitMs;
  await takeLockTurn(deadline);
  try {
    return await holdDatabaseLock(operation, databasePool, deadline);
  } finally {
    passLockTurn();
  }
}

async function holdDatabaseLock<T>(
  operation: () => Promise<T>,
  databasePool: MaintenanceLockPool,
  deadline: number
): Promise<T> {
  let client: MaintenanceLockClient;
  while (true) {
    client = await databasePool.connect();
    let locked: boolean;
    try {
      const lockResult = await client.query(
        'SELECT pg_try_advisory_lock($1::integer) AS locked',
        [UPLOADS_MAINTENANCE_LOCK_ID]
      );
      locked = lockResult.rows?.[0]?.locked === true;
    } catch (error) {
      client.release(error instanceof Error ? error : undefined);
      throw error;
    }
    if (locked) break;
    client.release();
    if (Date.now() + UPLOADS_LOCK_RETRY_MS > deadline) throw new UploadsLockBusyError();
    await new Promise((resolve) => setTimeout(resolve, UPLOADS_LOCK_RETRY_MS));
  }

  let failed = false;
  let operationError: unknown;
  let result: T | undefined;
  try {
    result = await operation();
  } catch (error) {
    failed = true;
    operationError = error;
  }

  let releaseError: Error | undefined;
  try {
    await client.query('SELECT pg_advisory_unlock($1::integer)', [
      UPLOADS_MAINTENANCE_LOCK_ID,
    ]);
  } catch (error) {
    releaseError = error instanceof Error ? error : new Error('Failed to release uploads lock');
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
  reconciliationRetryAt = 0;
  reconciliationError = undefined;
  return referencedFiles;
}

/** Caller must hold the uploads lock. */
export async function reconcileScreenshotStorageIfRequired(uploadsDirectory: string): Promise<void> {
  if (reconciliationRequired) await reconcileScreenshotStorage(uploadsDirectory);
}

export function requireScreenshotReconciliation(): void {
  reconciliationRequired = true;
}

export async function ensureReconciledScreenshotStorage(): Promise<void> {
  if (!reconciliationRequired) return;
  if (Date.now() < reconciliationRetryAt) throw reconciliationError;
  // Page renders do not wait for the lock; a busy lock leaves reconciliation pending for the next render.
  reconciliationPromise ??= withUploadsMaintenanceLock(async () => {
    const uploadsDirectory = await ensureUploadsDirectory();
    await reconcileScreenshotStorage(uploadsDirectory);
  }, pool, { waitMs: 0 }).catch((error) => {
    if (error instanceof UploadsLockBusyError) return;
    reconciliationRetryAt = Date.now() + RECONCILIATION_RETRY_DELAY_MS;
    reconciliationError = error;
    throw error;
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
