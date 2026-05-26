'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

export async function createFinding(prevState: any, formData: FormData) {
  const engagementId = formData.get('engagementId') as string;
  const title = formData.get('title') as string;
  const severity = formData.get('severity') as string;
  const background = formData.get('background') as string;
  const remediation = formData.get('remediation') as string;
  const supportingData = formData.get('supportingLinks') as string;

  if (!title || !severity) {
    return { error: 'Title and Severity are required' };
  }

  try {
    const data: any = {
      title,
      severity,
      background,
      remediation,
      supportingData
    };
    if (engagementId) data.engagementId = engagementId;

    await prisma.finding.create({
      data,
    });
    revalidatePath('/findings');
    return { success: 'Finding created successfully.' };
  } catch (e) {
    return { error: 'Failed to create finding.' };
  }
}

export async function updateFinding(id: string, prevState: any, formData: FormData) {
  const engagementId = formData.get('engagementId') as string;
  const title = formData.get('title') as string;
  const severity = formData.get('severity') as string;
  const background = formData.get('background') as string;
  const remediation = formData.get('remediation') as string;
  const supportingData = formData.get('supportingLinks') as string;

  if (!title || !severity) {
    return { error: 'Title and Severity are required' };
  }

  try {
    const data: any = {
      title,
      severity,
      background,
      remediation,
      supportingData
    };
    if (engagementId) data.engagementId = engagementId;

    await prisma.finding.update({
      where: { id },
      data,
    });
    revalidatePath('/findings');
    return { success: 'Finding updated successfully.' };
  } catch (e) {
    return { error: 'Failed to update finding.' };
  }
}

export async function deleteFinding(id: string) {
  try {
    const screenshots = await prisma.screenshot.findMany({ where: { findingId: id } });
    for (const snap of screenshots) {
      const filePath = join(process.cwd(), 'uploads', snap.filePath);
      await unlink(filePath).catch(() => {});
    }
    await prisma.finding.delete({ where: { id } });
    revalidatePath('/findings');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete finding.' };
  }
}

export async function uploadScreenshot(prevState: any, formData: FormData) {
  const findingId = formData.get('findingId') as string;
  const description = formData.get('description') as string;
  const file = formData.get('screenshot') as File;

  if (!findingId || !file || file.size === 0) {
    return { error: 'Valid file is required.' };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const extension = file.name.split('.').pop() || 'png';
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = join(process.cwd(), 'uploads', fileName);

  try {
    await writeFile(filePath, buffer);
    await prisma.screenshot.create({
      data: {
        findingId,
        description,
        filePath: fileName
      }
    });
    revalidatePath(`/findings/${findingId}`);
    return { success: 'Screenshot uploaded.' };
  } catch (e) {
    return { error: 'Upload failed.' };
  }
}

export async function deleteScreenshot(screenshotId: string, findingId: string) {
  try {
    const screenshot = await prisma.screenshot.findUnique({ where: { id: screenshotId } });
    if (screenshot) {
      const filePath = join(process.cwd(), 'uploads', screenshot.filePath);
      await unlink(filePath).catch(() => {});
      await prisma.screenshot.delete({ where: { id: screenshotId } });
    }
    revalidatePath(`/findings/${findingId}`);
  } catch (e) {
    console.error(e);
  }
}
