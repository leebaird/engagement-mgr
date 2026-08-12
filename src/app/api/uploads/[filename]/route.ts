import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { lstat } from 'fs/promises';
import { Readable } from 'stream';
import { getSession, isPasswordRotationRequired } from '@/lib/auth/session';
import { resolveUploadFilePath } from '@/lib/uploads-path';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getSession();

  if (!session || isPasswordRotationRequired(session.lastPasswordChange)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const resolvedParams = await params;
  const filePath = resolveUploadFilePath(resolvedParams.filename);

  if (!filePath) {
    return new NextResponse('File not found', { status: 404 });
  }

  // Only serve files that are registered screenshot records (not orphan/path-only hits)
  const screenshot = await prisma.screenshot.findFirst({
    where: { filePath: resolvedParams.filename },
    select: { id: true },
  });

  if (!screenshot) {
    return new NextResponse('File not found', { status: 404 });
  }

  try {
    const stats = await lstat(filePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      return new NextResponse('File not found', { status: 404 });
    }

    const ext = filePath.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';

    const stream = Readable.toWeb(createReadStream(filePath));

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stats.size),
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('File not found', { status: 404 });
  }
}
