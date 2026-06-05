import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { importDatabaseArchive, importDatabaseSql } from '@/lib/db-backup';

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No backup file provided' }, { status: 400 });
    }

    const name = file.name.toLowerCase();

    if (name.endsWith('.zip')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await importDatabaseArchive(buffer);
    } else if (name.endsWith('.sql')) {
      const sql = await file.text();
      if (!sql.trim()) {
        return NextResponse.json({ error: 'Backup file is empty' }, { status: 400 });
      }
      await importDatabaseSql(sql);
    } else {
      return NextResponse.json(
        { error: 'Use a .zip full backup from Backup, or a .sql database-only file' },
        { status: 400 }
      );
    }

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      {
        error:
          'Restore failed. Use a backup from Backup (.zip), or ensure psql/unzip are installed and the file is valid.',
      },
      { status: 500 }
    );
  }
}