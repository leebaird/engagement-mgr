export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, 'png' | 'jpg'> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

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