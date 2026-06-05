import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { exportDatabaseArchive } from '@/lib/db-backup';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const zip = await exportDatabaseArchive();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
    ].join('-') + '-' + [pad(now.getHours()), pad(now.getMinutes())].join('-');
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="em-backup-${timestamp}.zip"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Export failed. Ensure pg_dump and zip are installed and DATABASE_URL is valid.' },
      { status: 500 }
    );
  }
}