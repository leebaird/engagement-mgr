'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { isAuthError, requireAuth } from '@/lib/require-auth';
import { createUploadFilePath, resolveUploadFilePath } from '@/lib/uploads-path';
import { firstZodError, userIdSchema } from '@/lib/validation/common';
import { validateScreenshotUpload } from '@/lib/validation/upload';

export type FindingTemplateMatch = {
  id: string;
  title: string;
  category: string | null;
  severity: string;
  background: string | null;
  remediation: string | null;
  supportingLinks: string;
};

export async function searchFindingsByTitle(query: string): Promise<FindingTemplateMatch[]> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const findings = await prisma.finding.findMany({
    where: {
      title: { contains: trimmed, mode: 'insensitive' },
    },
    select: {
      id: true,
      title: true,
      category: true,
      severity: true,
      background: true,
      remediation: true,
      supportingData: true,
    },
    orderBy: { title: 'asc' },
    take: 10,
  });

  return findings.map((f) => ({
    id: f.id,
    title: f.title,
    category: f.category,
    severity: f.severity,
    background: f.background,
    remediation: f.remediation,
    supportingLinks: f.supportingData ?? '',
  }));
}

export async function createFinding(prevState: any, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const engagementId = formData.get('engagementId') as string;
  const title = formData.get('title') as string;
  const observation = formData.get('observation') as string;
  const category = formData.get('category') as string;
  const severity = formData.get('severity') as string;
  const background = formData.get('background') as string;
  const remediation = formData.get('remediation') as string;
  const supportingData = formData.get('supportingLinks') as string;
  const affectedHosts = formData.get('affectedHosts') as string;

  if (!title) {
    return { error: 'Title is required' };
  }

  try {
    const findingData: {
      title: string;
      category: string;
      severity: string;
      background: string;
      remediation: string;
      supportingData: string;
      engagementId?: string;
      engagementContext?: {
        create: {
          engagementId: string;
          observation: string | null;
          affectedHosts: string | null;
        };
      };
    } = {
      title,
      category,
      severity: severity || '',
      background,
      remediation,
      supportingData,
    };

    if (engagementId) {
      findingData.engagementId = engagementId;
      findingData.engagementContext = {
        create: {
          engagementId,
          observation: observation || null,
          affectedHosts: affectedHosts || null,
        },
      };
    }

    await prisma.finding.create({ data: findingData });
    revalidatePath('/findings');
    if (engagementId) {
      revalidatePath('/engagements');
    }
    return { success: 'Finding created successfully.' };
  } catch (e) {
    console.error('Create Finding error:', e);
    return { error: 'Failed to create finding.' };
  }
}

export async function updateFinding(id: string, prevState: any, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const engagementId = formData.get('engagementId') as string;
  const engagementScoped = formData.get('engagementScoped') === 'true';
  const title = formData.get('title') as string;
  const observation = formData.get('observation') as string;
  const category = formData.get('category') as string;
  const severity = formData.get('severity') as string;
  const background = formData.get('background') as string;
  const remediation = formData.get('remediation') as string;
  const supportingData = formData.get('supportingLinks') as string;
  const affectedHosts = formData.get('affectedHosts') as string;

  if (!title) {
    return { error: 'Title is required' };
  }

  try {
    const data: {
      title: string;
      category: string;
      severity: string;
      background: string;
      remediation: string;
      supportingData: string;
      engagementId?: string;
    } = {
      title,
      category,
      severity: severity || '',
      background,
      remediation,
      supportingData,
    };
    if (engagementId) data.engagementId = engagementId;

    const existing = await prisma.finding.findUnique({
      where: { id },
      select: { engagementId: true },
    });

    await prisma.finding.update({
      where: { id },
      data,
    });

    const scopedEngagementId = engagementId || existing?.engagementId;
    if (engagementScoped && scopedEngagementId) {
      await prisma.engagementFindingContext.upsert({
        where: { findingId: id },
        create: {
          engagementId: scopedEngagementId,
          findingId: id,
          observation: observation || null,
          affectedHosts: affectedHosts || null,
        },
        update: {
          observation: observation || null,
          affectedHosts: affectedHosts || null,
        },
      });
    }

    revalidatePath('/findings');
    if (scopedEngagementId) {
      revalidatePath('/engagements');
    }
    return { success: 'Finding updated successfully.' };
  } catch (e) {
    console.error('Update Finding error:', e);
    return { error: 'Failed to update finding.' };
  }
}

export async function deleteFinding(id: string) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  try {
    const screenshots = await prisma.screenshot.findMany({ where: { findingId: id } });
    for (const snap of screenshots) {
      const filePath = resolveUploadFilePath(snap.filePath);
      if (!filePath) continue;
      await unlink(filePath).catch(() => {});
    }
    const finding = await prisma.finding.findUnique({
      where: { id },
      select: { engagementId: true },
    });
    await prisma.finding.delete({ where: { id } });
    revalidatePath('/findings');
    if (finding?.engagementId) {
      revalidatePath('/engagements');
    }
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete finding.' };
  }
}

export async function uploadScreenshot(prevState: any, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const findingIdParsed = userIdSchema.safeParse(formData.get('findingId'));
  if (!findingIdParsed.success) {
    return { error: firstZodError(findingIdParsed.error) };
  }

  const fileResult = validateScreenshotUpload(formData.get('screenshot'));
  if (!fileResult.ok) {
    return { error: fileResult.error };
  }

  const uploadPath = createUploadFilePath(fileResult.extension);
  if (!uploadPath) {
    return { error: 'Upload failed.' };
  }

  const description = String(formData.get('description') ?? '').trim().slice(0, 500);
  const findingId = findingIdParsed.data;
  const { file } = fileResult;
  const { absolutePath, fileName } = uploadPath;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    await writeFile(absolutePath, buffer);
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
  const auth = await requireAuth();
  if (isAuthError(auth)) return;

  try {
    const screenshot = await prisma.screenshot.findUnique({ where: { id: screenshotId } });
    if (screenshot) {
      const filePath = resolveUploadFilePath(screenshot.filePath);
      if (filePath) {
        await unlink(filePath).catch(() => {});
      }
      await prisma.screenshot.delete({ where: { id: screenshotId } });
    }
    revalidatePath(`/findings/${findingId}`);
  } catch (e) {
    console.error(e);
  }
}