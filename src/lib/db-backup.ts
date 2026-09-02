import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'fs/promises';
import { existsSync } from 'fs';
import { inflateRawSync } from 'zlib';
import { promisify } from 'util';
import { basename, dirname, join, resolve } from 'path';
import { tmpdir } from 'os';
import { prisma } from '@/lib/db';
import { getPgToolsConnection } from '@/lib/require-admin';
import { prepareDefaultAdminUser } from '@/lib/seed-default-admin';
import { APPLICATION_SETTING_ID } from '@/lib/highlight-color';
import {
  getUploadsDirectory,
  ensureUploadsDirectory,
} from '@/lib/uploads-path';
import {
  MAX_SCREENSHOT_FILES,
  MAX_SCREENSHOT_STORAGE_BYTES,
  withUploadsMaintenanceLock,
} from '@/lib/screenshot-storage';
import { MAX_SCREENSHOT_BYTES } from '@/lib/validation/upload';

const execFileAsync = promisify(execFile);

const MAX_ARCHIVE_BYTES = 500 * 1024 * 1024;
const MAX_DATABASE_DUMP_BYTES = 500 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = MAX_SCREENSHOT_FILES + 3;
const MAX_COMPRESSION_RATIO = 20;
const ARCHIVE_COMMAND_TIMEOUT_MS = 2 * 60 * 1000;
const DATABASE_COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const BACKUP_FOLDER = 'engagement-manager-backup';
const DATABASE_DUMP_ENTRY = `${BACKUP_FOLDER}/database.dump`;
const SCREENSHOT_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg)$/i;
const UPLOAD_ENTRY_PATTERN = new RegExp(
  `^${BACKUP_FOLDER}/uploads/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(png|jpg)$`,
  'i'
);

const PG_DUMP_ARGS = [
  '--format=custom',
  '--no-owner',
  '--no-acl',
  '--encoding=UTF8',
];

function subprocessEnvironment(
  overrides: Record<string, string | undefined> = {}
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
  for (const key of [
    'HOME',
    'LANG',
    'LC_ALL',
    'LC_CTYPE',
    'PATH',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'TMPDIR',
    'WINDIR',
  ]) {
    if (process.env[key] !== undefined) {
      environment[key] = process.env[key];
    }
  }
  return { ...environment, ...overrides };
}

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  dataOffset: number;
  isDirectory: boolean;
};

function findEndOfCentralDirectory(archive: Buffer): number {
  const minimumOffset = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= minimumOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error('Invalid backup: ZIP directory is missing');
}

function parseZipEntries(archive: Buffer): ZipEntry[] {
  if (archive.length < 22) {
    throw new Error('Invalid backup: ZIP file is truncated');
  }

  const endOffset = findEndOfCentralDirectory(archive);
  const diskNumber = archive.readUInt16LE(endOffset + 4);
  const directoryDisk = archive.readUInt16LE(endOffset + 6);
  const entriesOnDisk = archive.readUInt16LE(endOffset + 8);
  const entryCount = archive.readUInt16LE(endOffset + 10);
  const directorySize = archive.readUInt32LE(endOffset + 12);
  const directoryOffset = archive.readUInt32LE(endOffset + 16);

  if (
    diskNumber !== 0 ||
    directoryDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff
  ) {
    throw new Error('Invalid backup: multi-disk and ZIP64 archives are not supported');
  }
  if (entryCount > MAX_ARCHIVE_ENTRIES || directoryOffset + directorySize > endOffset) {
    throw new Error('Invalid backup: archive contains too many entries');
  }

  const entries: ZipEntry[] = [];
  const names = new Set<string>();
  let offset = directoryOffset;
  let totalCompressedBytes = 0;
  let totalUncompressedBytes = 0;
  let screenshotBytes = 0;
  let screenshotFiles = 0;
  let hasDatabaseDump = false;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > endOffset || archive.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Invalid backup: ZIP directory is malformed');
    }

    const flags = archive.readUInt16LE(offset + 8);
    const compressionMethod = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const uncompressedSize = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const externalAttributes = archive.readUInt32LE(offset + 38);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;

    if (nextOffset > endOffset || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      throw new Error('Invalid backup: ZIP entry is malformed');
    }
    if ((flags & 0x1) !== 0 || ![0, 8].includes(compressionMethod)) {
      throw new Error('Invalid backup: encrypted or unsupported ZIP entry');
    }

    const name = archive.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    const normalized = name.replaceAll('\\', '/');
    const isDirectory = normalized.endsWith('/');
    const unixMode = externalAttributes >>> 16;

    if (
      !normalized ||
      normalized !== name ||
      normalized.startsWith('/') ||
      normalized.split('/').includes('..') ||
      names.has(normalized) ||
      (unixMode & 0o170000) === 0o120000
    ) {
      throw new Error('Invalid backup: archive contains unsafe paths');
    }
    names.add(normalized);

    const allowedDirectory =
      isDirectory &&
      (normalized === `${BACKUP_FOLDER}/` || normalized === `${BACKUP_FOLDER}/uploads/`);
    const allowedFile = normalized === DATABASE_DUMP_ENTRY || UPLOAD_ENTRY_PATTERN.test(normalized);
    if (!allowedDirectory && !allowedFile) {
      throw new Error('Invalid backup: archive contains an unexpected entry');
    }

    if (localHeaderOffset + 30 > directoryOffset || archive.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error('Invalid backup: ZIP local header is malformed');
    }
    const localNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const localName = archive
      .subarray(localHeaderOffset + 30, localHeaderOffset + 30 + localNameLength)
      .toString('utf8');
    if (localName !== name || dataOffset + compressedSize > directoryOffset) {
      throw new Error('Invalid backup: ZIP entry boundaries are invalid');
    }

    if (normalized === DATABASE_DUMP_ENTRY) {
      hasDatabaseDump = true;
      if (uncompressedSize === 0 || uncompressedSize > MAX_DATABASE_DUMP_BYTES) {
        throw new Error('Invalid backup: database dump size is invalid');
      }
    } else if (!isDirectory) {
      screenshotFiles += 1;
      screenshotBytes += uncompressedSize;
      if (uncompressedSize === 0 || uncompressedSize > MAX_SCREENSHOT_BYTES) {
        throw new Error('Invalid backup: screenshot size is invalid');
      }
    }

    totalCompressedBytes += compressedSize;
    totalUncompressedBytes += uncompressedSize;
    entries.push({
      name: normalized,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      dataOffset,
      isDirectory,
    });
    offset = nextOffset;
  }

  if (
    offset !== directoryOffset + directorySize ||
    !hasDatabaseDump ||
    screenshotFiles > MAX_SCREENSHOT_FILES ||
    screenshotBytes > MAX_SCREENSHOT_STORAGE_BYTES ||
    totalUncompressedBytes > MAX_DATABASE_DUMP_BYTES + MAX_SCREENSHOT_STORAGE_BYTES ||
    (totalCompressedBytes === 0
      ? totalUncompressedBytes > 0
      : totalUncompressedBytes / totalCompressedBytes > MAX_COMPRESSION_RATIO)
  ) {
    throw new Error('Invalid backup: archive exceeds extraction limits');
  }

  return entries;
}

function extractEntry(archive: Buffer, entry: ZipEntry): Buffer {
  const compressed = archive.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  const content =
    entry.compressionMethod === 0
      ? Buffer.from(compressed)
      : inflateRawSync(compressed, { maxOutputLength: entry.uncompressedSize });
  if (content.length !== entry.uncompressedSize) {
    throw new Error('Invalid backup: ZIP entry size does not match its directory');
  }
  return content;
}

export async function extractBackupArchive(archive: Buffer, rootDirectory: string): Promise<void> {
  const entries = parseZipEntries(archive);
  for (const entry of entries) {
    const target = resolve(rootDirectory, entry.name);
    if (!target.startsWith(`${resolve(rootDirectory)}/`)) {
      throw new Error('Invalid backup: archive contains unsafe paths');
    }
    if (entry.isDirectory) {
      await mkdir(target, { recursive: true, mode: 0o700 });
      await chmod(target, 0o700);
    } else {
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, extractEntry(archive, entry), { flag: 'wx', mode: 0o600 });
    }
  }
}

export async function assertZipEntriesSafe(zipPath: string): Promise<void> {
  parseZipEntries(await readFile(zipPath));
}

export async function assertExtractedPathsContained(rootDirectory: string): Promise<void> {
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (!path.startsWith(`${resolve(rootDirectory)}/`)) {
        throw new Error('Invalid backup: archive contains unsafe paths');
      }
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        throw new Error('Invalid backup: archive contains symlinks');
      }
      if (stats.isDirectory()) {
        await chmod(path, 0o700);
        await walk(path);
      } else if (stats.isFile()) {
        await chmod(path, 0o600);
      } else {
        throw new Error('Invalid backup: archive contains unsupported files');
      }
    }
  }
  await walk(rootDirectory);
}

async function withPrivateTempDirectory<T>(operation: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'em-backup-'));
  await chmod(directory, 0o700);
  try {
    return await operation(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function withPgPass<T>(
  directory: string,
  operation: (connectionUrl: string, environment: NodeJS.ProcessEnv) => Promise<T>
): Promise<T> {
  const { connectionUrl, pgPassLine } = getPgToolsConnection();
  const pgPassPath = join(directory, '.pgpass');
  await writeFile(pgPassPath, `${pgPassLine}\n`, { flag: 'wx', mode: 0o600 });
  const environment = subprocessEnvironment({ PGPASSFILE: pgPassPath });
  try {
    return await operation(connectionUrl, environment);
  } finally {
    await rm(pgPassPath, { force: true });
  }
}

async function runPgDump(destination: string, workDirectory: string): Promise<void> {
  await withPgPass(workDirectory, async (connectionUrl, environment) => {
    await execFileAsync(
      'pg_dump',
      ['--dbname', connectionUrl, ...PG_DUMP_ARGS, '--file', destination],
      { env: environment, timeout: DATABASE_COMMAND_TIMEOUT_MS }
    );
  });
  await chmod(destination, 0o600);
}

async function runPgRestore(dumpPath: string, workDirectory: string): Promise<void> {
  await withPgPass(workDirectory, async (connectionUrl, environment) => {
    await execFileAsync(
      'pg_restore',
      [
        '--dbname',
        connectionUrl,
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-acl',
        '--exit-on-error',
        '--single-transaction',
        dumpPath,
      ],
      { env: environment, timeout: DATABASE_COMMAND_TIMEOUT_MS }
    );
  });
}

async function prepareUploadsDirectory(source?: string): Promise<string> {
  const destination = await mkdtemp(join(process.cwd(), '.uploads-restore-'));
  await chmod(destination, 0o700);
  if (source && existsSync(source)) {
    await copyScreenshotFiles(source, destination);
  }
  await assertExtractedPathsContained(destination);
  return destination;
}

async function copyScreenshotFiles(source: string, destination: string): Promise<void> {
  let totalBytes = 0;
  let fileCount = 0;

  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') {
      continue;
    }
    if (!entry.isFile() || !SCREENSHOT_FILENAME_PATTERN.test(entry.name)) {
      throw new Error('Uploads directory contains an unsupported file');
    }
    const sourcePath = join(source, entry.name);
    const stats = await lstat(sourcePath);
    totalBytes += stats.size;
    fileCount += 1;
    if (
      stats.size === 0 ||
      stats.size > MAX_SCREENSHOT_BYTES ||
      totalBytes > MAX_SCREENSHOT_STORAGE_BYTES ||
      fileCount > MAX_SCREENSHOT_FILES
    ) {
      throw new Error('Uploads directory exceeds screenshot storage limits');
    }
    const destinationPath = join(destination, entry.name);
    await cp(sourcePath, destinationPath);
    await chmod(destinationPath, 0o600);
  }
}

async function runWithUploadsReplacement<T>(
  preparedUploads: string,
  operation: () => Promise<T>
): Promise<T> {
  const uploads = await ensureUploadsDirectory();
  return replaceDirectoryDuringOperation(uploads, preparedUploads, operation);
}

export async function replaceDirectoryDuringOperation<T>(
  currentDirectory: string,
  preparedDirectory: string,
  operation: () => Promise<T>
): Promise<T> {
  const previousDirectory = join(
    dirname(currentDirectory),
    `.${basename(currentDirectory)}-previous-${randomUUID()}`
  );
  let previousMoved = false;
  let installed = false;
  let operationCompleted = false;

  try {
    await rename(currentDirectory, previousDirectory);
    previousMoved = true;
    await rename(preparedDirectory, currentDirectory);
    installed = true;
    const result = await operation();
    operationCompleted = true;
    await rm(previousDirectory, { recursive: true, force: true }).catch(() => {});
    return result;
  } catch (error) {
    if (previousMoved && !operationCompleted) {
      if (installed) {
        await rm(currentDirectory, { recursive: true, force: true });
      }
      await rename(previousDirectory, currentDirectory);
    }
    throw error;
  } finally {
    await rm(preparedDirectory, { recursive: true, force: true });
    if (operationCompleted) {
      await rm(previousDirectory, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export async function exportDatabaseArchive(): Promise<Buffer> {
  return withUploadsMaintenanceLock(() =>
    withPrivateTempDirectory(async (workDirectory) => {
      const backupDirectory = join(workDirectory, BACKUP_FOLDER);
      const backupUploads = join(backupDirectory, 'uploads');
      await mkdir(backupUploads, { recursive: true, mode: 0o700 });
      await runPgDump(join(backupDirectory, 'database.dump'), workDirectory);

      const uploads = getUploadsDirectory();
      if (existsSync(uploads)) {
        await copyScreenshotFiles(uploads, backupUploads);
      }
      await assertExtractedPathsContained(backupDirectory);

      const zipPath = join(workDirectory, 'backup.zip');
      await execFileAsync('zip', ['-rq', zipPath, BACKUP_FOLDER], {
        cwd: workDirectory,
        env: subprocessEnvironment(),
        timeout: ARCHIVE_COMMAND_TIMEOUT_MS,
      });
      await chmod(zipPath, 0o600);
      const archive = await readFile(zipPath);
      if (archive.length > MAX_ARCHIVE_BYTES) {
        throw new Error('Database export is too large');
      }
      parseZipEntries(archive);
      return archive;
    })
  );
}

export async function importDatabaseArchive(archive: Buffer): Promise<void> {
  if (archive.length === 0 || archive.length > MAX_ARCHIVE_BYTES) {
    throw new Error('Backup archive is too large');
  }

  await withUploadsMaintenanceLock(() =>
    withPrivateTempDirectory(async (workDirectory) => {
      await extractBackupArchive(archive, workDirectory);
      const backupDirectory = join(workDirectory, BACKUP_FOLDER);
      const databaseDump = join(backupDirectory, 'database.dump');
      const preparedUploads = await prepareUploadsDirectory(join(backupDirectory, 'uploads'));
      await runWithUploadsReplacement(preparedUploads, () =>
        runPgRestore(databaseDump, workDirectory)
      );
    })
  );
}

export async function deleteAllDatabaseData(defaultAdminPassword?: string): Promise<void> {
  const admin = await prepareDefaultAdminUser(defaultAdminPassword);
  const preparedUploads = await prepareUploadsDirectory();

  await withUploadsMaintenanceLock(() =>
    runWithUploadsReplacement(preparedUploads, () =>
      prisma.$transaction(
        async (transaction) => {
          await transaction.$executeRawUnsafe(`
            DO $$ DECLARE r RECORD;
            BEGIN
              FOR r IN (
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
              ) LOOP
                EXECUTE format('TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE', 'public', r.tablename);
              END LOOP;
            END $$;
          `);
          await transaction.user.create({ data: admin.data });
          await transaction.applicationSetting.create({
            data: { id: APPLICATION_SETTING_ID, highlightColor: 'Pink' },
          });
        },
        { maxWait: 5_000, timeout: 30_000 }
      )
    )
  );
}
