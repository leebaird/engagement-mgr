import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { getSession } from '@/lib/auth/session';
import { resolveBackupFilePath } from '@/lib/backup-path';
import { verifyBackupDownloadToken } from '@/lib/backup-download-token';

/**
 * Download an existing backup file written by the password-gated export action.
 * Requires admin session + a short-lived download token issued at export time.
 * Streams from disk — does not buffer the full archive in memory.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const filename = request.nextUrl.searchParams.get('file')?.trim() ?? '';
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';
  const absolutePath = resolveBackupFilePath(filename);

  if (!absolutePath) {
    return new NextResponse('File not found', { status: 404 });
  }

  const tokenOk = await verifyBackupDownloadToken(token, session.userId, filename);
  if (!tokenOk) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return new NextResponse('File not found', { status: 404 });
    }

    const stream = Readable.toWeb(createReadStream(absolutePath));

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(fileStat.size),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new NextResponse('File not found', { status: 404 });
  }
}

export async function POST() {
  return new NextResponse('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'GET' },
  });
}
