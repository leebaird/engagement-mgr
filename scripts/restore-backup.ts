import { readBackupArchiveFile } from '../src/lib/backup-restore-file';
import { importDatabaseArchive } from '../src/lib/db-backup';

const filePath = process.argv[2];
if (!filePath || process.argv.length !== 3) {
  throw new Error('Usage: npm run db:restore -- /path/to/em-backup.zip');
}

const archive = await readBackupArchiveFile(filePath);
await importDatabaseArchive(archive);
process.stdout.write('Backup restored successfully. Restart the application before accepting traffic.\n');
