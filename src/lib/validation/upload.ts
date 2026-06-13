export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, 'png' | 'jpg'> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

function detectImageExtension(buffer: Buffer): 'png' | 'jpg' | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  return null;
}

export function validateScreenshotBuffer(
  buffer: Buffer,
  claimedExtension: 'png' | 'jpg'
): { ok: true } | { ok: false; error: string } {
  const detected = detectImageExtension(buffer);
  if (!detected) {
    return { ok: false, error: 'File content is not a valid PNG or JPEG image.' };
  }

  if (detected !== claimedExtension) {
    return { ok: false, error: 'File content does not match the declared image type.' };
  }

  return { ok: true };
}

export function validateScreenshotUpload(
  file: unknown
): { ok: true; file: File; extension: 'png' | 'jpg' } | { ok: false; error: string } {
  if (!file || typeof file === 'string' || !(file instanceof File)) {
    return { ok: false, error: 'Valid file is required.' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'Valid file is required.' };
  }

  if (file.size > MAX_SCREENSHOT_BYTES) {
    return { ok: false, error: 'Screenshot must be 5 MB or smaller.' };
  }

  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) {
    return { ok: false, error: 'Only PNG and JPEG images are allowed.' };
  }

  return { ok: true, file, extension };
}