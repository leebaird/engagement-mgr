import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { resolveUploadFilePath } from '@/lib/uploads-path';
import { readFile } from 'fs/promises';

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const session = await getSession();

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const resolvedParams = await params;
  const filePath = resolveUploadFilePath(resolvedParams.filename);

  if (!filePath) {
    return new NextResponse('File not found', { status: 404 });
  }

  try {
    const file = await readFile(filePath);

    const ext = filePath.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';

    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('File not found', { status: 404 });
  }
}