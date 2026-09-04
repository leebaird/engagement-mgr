import sharp from 'sharp';

export async function normalizeScreenshot(buffer: Buffer): Promise<Buffer> {
  if (!buffer.length || buffer.length > 5 * 1024 * 1024)
    throw new Error('Image exceeds the 5 MB limit.');
  const image = sharp(buffer, {
    limitInputPixels: 16_000_000,
    failOn: 'warning',
    animated: false,
  });
  const metadata = await image.metadata();
  if (
    !['png', 'jpeg'].includes(metadata.format ?? '') ||
    (metadata.pages ?? 1) !== 1
  )
    throw new Error('Only single-frame PNG and JPEG images are supported.');
  const result = await image
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  if (result.length > 5 * 1024 * 1024)
    throw new Error('Decoded image exceeds the size limit.');
  return result;
}
