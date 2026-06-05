import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, rm, mkdir, cp } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { prisma } from '@/lib/db';
import { getPgToolsConnectionUrl } from '@/lib/require-admin';
import { seedDefaultAdminUser } from '@/lib/seed-default-admin';

const execFileAsync = promisify(execFile);

const MAX_SQL_BYTES = 500 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 500 * 1024 * 1024;
const BACKUP_FOLDER = 'engagement-manager-backup';

const PG_DUMP_ARGS = [
  '--clean',
  '--if-exists',
  '--no-owner',
  '--no-acl',
  '--encoding=UTF8',
];

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = join(tmpdir(), `em-backup-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runPgDump(destPath: string): Promise<void> {
  await execFileAsync(
    'pg_dump',
    [getPgToolsConnectionUrl(), ...PG_DUMP_ARGS, '-f', destPath],
    { env: process.env }
  );
}

async function runPsqlFile(sqlPath: string): Promise<void> {
  await execFileAsync(
    'psql',
    [getPgToolsConnectionUrl(), '-v', 'ON_ERROR_STOP=1', '-f', sqlPath],
    { maxBuffer: MAX_SQL_BYTES, env: process.env }
  );
}

/** Full PostgreSQL dump (schema, data, enums, relations) for server migration. */
export async function exportDatabaseSql(): Promise<string> {
  return withTempDir(async (dir) => {
    const sqlPath = join(dir, 'database.sql');
    await runPgDump(sqlPath);
    const sql = await readFile(sqlPath, 'utf8');
    if (sql.length > MAX_SQL_BYTES) {
      throw new Error('Database export is too large');
    }
    return sql;
  });
}

/** Zip containing database.sql and uploads/ (finding screenshots). */
export async function exportDatabaseArchive(): Promise<Buffer> {
  return withTempDir(async (workDir) => {
    const backupDir = join(workDir, BACKUP_FOLDER);
    await mkdir(join(backupDir, 'uploads'), { recursive: true });

    await runPgDump(join(backupDir, 'database.sql'));

    const uploadsSrc = join(process.cwd(), 'uploads');
    if (existsSync(uploadsSrc)) {
      await cp(uploadsSrc, join(backupDir, 'uploads'), { recursive: true });
    }

    const zipPath = join(workDir, 'backup.zip');
    await execFileAsync('zip', ['-rq', zipPath, BACKUP_FOLDER], { cwd: workDir });
    const zip = await readFile(zipPath);
    if (zip.length > MAX_ARCHIVE_BYTES) {
      throw new Error('Backup archive is too large');
    }
    return zip;
  });
}

export async function importDatabaseSql(sql: string): Promise<void> {
  if (sql.length > MAX_SQL_BYTES) {
    throw new Error('Backup file is too large');
  }

  const tmpPath = join(tmpdir(), `engagement-mgr-import-${Date.now()}.sql`);
  await writeFile(tmpPath, sql, 'utf8');

  try {
    await runPsqlFile(tmpPath);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

export async function importDatabaseArchive(buffer: Buffer): Promise<void> {
  if (buffer.length > MAX_ARCHIVE_BYTES) {
    throw new Error('Backup archive is too large');
  }

  await withTempDir(async (workDir) => {
    const zipPath = join(workDir, 'upload.zip');
    await writeFile(zipPath, buffer);
    await execFileAsync('unzip', ['-q', zipPath, '-d', workDir]);

    const backupDir = join(workDir, BACKUP_FOLDER);
    const sqlPath = join(backupDir, 'database.sql');
    if (!existsSync(sqlPath)) {
      throw new Error('Invalid backup: database.sql is missing');
    }

    await runPsqlFile(sqlPath);

    const uploadsBackup = join(backupDir, 'uploads');
    if (existsSync(uploadsBackup)) {
      const uploadsDest = join(process.cwd(), 'uploads');
      await rm(uploadsDest, { recursive: true, force: true });
      await mkdir(uploadsDest, { recursive: true });
      await cp(uploadsBackup, uploadsDest, { recursive: true });
    }
  });
}

/** Remove all application data (keeps schema and _prisma_migrations). */
export async function deleteAllDatabaseData(): Promise<void> {
  await prisma.$executeRawUnsafe(`
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

  const uploadsDest = join(process.cwd(), 'uploads');
  if (existsSync(uploadsDest)) {
    await rm(uploadsDest, { recursive: true, force: true });
  }
  await mkdir(uploadsDest, { recursive: true });

  await seedDefaultAdminUser();
}