import 'dotenv/config';
import { readBackupArchiveFile } from '../src/lib/backup-restore-file';
import { importDatabaseArchive } from '../src/lib/db-backup';

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath || process.argv.length !== 3) {
    throw new Error('Usage: npm run db:restore -- /path/to/em-backup.zip');
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL must be set in .env or the environment before restoring a backup.');
  }

  const archive = await readBackupArchiveFile(filePath);
  await importDatabaseArchive(archive);
  process.stdout.write('Backup restored successfully. Restart the application before accepting traffic.\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
