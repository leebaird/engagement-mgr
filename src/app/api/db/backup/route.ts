import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { getSession } from '@/lib/auth/session';
import {
  backupFilename,
  ensureBackupDirectory,
  resolveBackupFilePath,
} from '@/lib/backup-path';
import { exportDatabaseArchive } from '@/lib/db-backup';

export async function GET() {
  return new NextResponse('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const zip = await exportDatabaseArchive();
    const filename = backupFilename();
    await ensureBackupDirectory();
    const absolutePath = resolveBackupFilePath(filename);

    if (!absolutePath) {
      return new NextResponse('Failed to prepare backup file path.', { status: 500 });
    }

    await writeFile(absolutePath, zip);

    return new NextResponse(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(
      'Export failed. Ensure pg_dump and zip are installed and DATABASE_URL is valid.',
      { status: 500 },
    );
  }
}
