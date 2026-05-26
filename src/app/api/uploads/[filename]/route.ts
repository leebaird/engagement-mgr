import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const session = await getSession();
  
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const resolvedParams = await params;
  const filePath = join(process.cwd(), 'uploads', resolvedParams.filename);

  try {
    const file = await readFile(filePath);
    
    // Guess basic mime types from extension
    const ext = resolvedParams.filename.split('.').pop()?.toLowerCase();
    let mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';

    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    return new NextResponse('File not found', { status: 404 });
  }
}
