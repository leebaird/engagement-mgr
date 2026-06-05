import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { deleteAllDatabaseData } from '@/lib/db-backup';
import { requireAdmin } from '@/lib/require-admin';

export async function POST() {
  const session = await requireAdmin();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await deleteAllDatabaseData();
    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Reset failed.' }, { status: 500 });
  }
}