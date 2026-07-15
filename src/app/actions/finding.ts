'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { writeFile, unlink } from 'fs/promises';
import { isAuthError, requireAuth } from '@/lib/require-auth';
import { createUploadFilePath, resolveUploadFilePath } from '@/lib/uploads-path';
import { firstZodError, uuidSchema } from '@/lib/validation/common';
import {
  createFindingSchema,
  deleteScreenshotSchema,
  findingSearchQuerySchema,
  screenshotDescriptionSchema,
  updateFindingSchema,
} from '@/lib/validation/finding';
import { validateScreenshotBuffer, validateScreenshotUpload } from '@/lib/validation/upload';
import { finishDetailDelete, finishDetailUpdate, updateErrorCode } from '@/lib/detail-delete-form';

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

  const parsed = findingSearchQuerySchema.safeParse(query);
  if (!parsed.success || !parsed.data) return [];

  const findings = await prisma.finding.findMany({
    where: {
      title: { contains: parsed.data, mode: 'insensitive' },
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

export async function createFinding(_prevState: unknown, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const parsed = createFindingSchema.safeParse({
    engagementId: formData.get('engagementId'),
    title: formData.get('title'),
    observation: formData.get('observation'),
    category: formData.get('category'),
    severity: formData.get('severity'),
    background: formData.get('background'),
    remediation: formData.get('remediation'),
    supportingLinks: formData.get('supportingLinks'),
    affectedHosts: formData.get('affectedHosts'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const {
    engagementId,
    title,
    observation,
    category,
    severity,
    background,
    remediation,
    supportingLinks,
    affectedHosts,
  } = parsed.data;

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
      severity,
      background,
      remediation,
      supportingData: supportingLinks,
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
    revalidatePath('/dashboard/findings');
    if (engagementId) {
      revalidatePath('/dashboard/engagements');
    }
    return { success: 'Finding created successfully.' };
  } catch (e) {
    console.error('Create Finding error:', e);
    return { error: 'Failed to create finding.' };
  }
}

export async function updateFinding(id: string, _prevState: unknown, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const parsed = updateFindingSchema.safeParse({
    engagementId: formData.get('engagementId'),
    engagementScoped: formData.get('engagementScoped'),
    title: formData.get('title'),
    observation: formData.get('observation'),
    category: formData.get('category'),
    severity: formData.get('severity'),
    background: formData.get('background'),
    remediation: formData.get('remediation'),
    supportingLinks: formData.get('supportingLinks'),
    affectedHosts: formData.get('affectedHosts'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const {
    engagementId,
    engagementScoped,
    title,
    observation,
    category,
    severity,
    background,
    remediation,
    supportingLinks,
    affectedHosts,
  } = parsed.data;

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
      severity,
      background,
      remediation,
      supportingData: supportingLinks,
    };
    if (engagementId) data.engagementId = engagementId;

    const existing = await prisma.finding.findUnique({
      where: { id: idParsed.data },
      select: { engagementId: true },
    });

    await prisma.finding.update({
      where: { id: idParsed.data },
      data,
    });

    const scopedEngagementId = engagementId || existing?.engagementId;
    if (engagementScoped && scopedEngagementId) {
      await prisma.engagementFindingContext.upsert({
        where: { findingId: idParsed.data },
        create: {
          engagementId: scopedEngagementId,
          findingId: idParsed.data,
          observation: observation || null,
          affectedHosts: affectedHosts || null,
        },
        update: {
          engagementId: scopedEngagementId,
          observation: observation || null,
          affectedHosts: affectedHosts || null,
        },
      });
    }

    revalidatePath('/dashboard/findings');
    if (scopedEngagementId) {
      revalidatePath('/dashboard/engagements');
    }
    return { success: 'Finding updated successfully.' };
  } catch (e) {
    console.error('Update Finding error:', e);
    return { error: 'Failed to update finding.' };
  }
}

export async function updateFindingFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await updateFinding(id, {}, formData);
  finishDetailUpdate('/dashboard/findings', formData, id, result, updateErrorCode(result.error));
}

export async function deleteFindingFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const engagementId = formData.get('engagementId')?.toString();
  const result = await deleteFinding(id);
  const code = result.error?.includes('Unauthorized') ? 'unauthorized' : 'generic';
  if (engagementId) {
    finishDetailDelete('/dashboard/engagements', formData, engagementId, result, code, ['finding'], {
      successDetailId: engagementId,
    });
    return;
  }
  finishDetailDelete('/dashboard/findings', formData, id, result, code);
}

export async function deleteFinding(id: string) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  try {
    const screenshots = await prisma.screenshot.findMany({ where: { findingId: idParsed.data } });
    const finding = await prisma.finding.findUnique({
      where: { id: idParsed.data },
      select: { engagementId: true },
    });
    await prisma.finding.delete({ where: { id: idParsed.data } });
    // Remove files only after the DB delete succeeds (a failed delete must not
    // leave screenshot records pointing at missing files)
    for (const snap of screenshots) {
      const filePath = resolveUploadFilePath(snap.filePath);
      if (!filePath) continue;
      await unlink(filePath).catch(() => {});
    }
    revalidatePath('/dashboard/findings');
    if (finding?.engagementId) {
      revalidatePath('/dashboard/engagements');
    }
    return { success: true };
  } catch {
    return { error: 'Failed to delete finding.' };
  }
}

export async function uploadScreenshot(_prevState: unknown, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const findingIdParsed = uuidSchema.safeParse(formData.get('findingId'));
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

  const descriptionParsed = screenshotDescriptionSchema.safeParse(formData.get('description') ?? '');
  const description = descriptionParsed.success ? descriptionParsed.data : '';

  const findingId = findingIdParsed.data;
  const { file } = fileResult;
  const { absolutePath, fileName } = uploadPath;

  const finding = await prisma.finding.findUnique({
    where: { id: findingId },
    select: { id: true },
  });
  if (!finding) {
    return { error: 'Finding not found.' };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const bufferResult = validateScreenshotBuffer(buffer, fileResult.extension);
  if (!bufferResult.ok) {
    return { error: bufferResult.error };
  }

  try {
    await writeFile(absolutePath, buffer);
    await prisma.screenshot.create({
      data: {
        findingId,
        description,
        filePath: fileName,
      },
    });
    revalidatePath(`/dashboard/findings/${findingId}`);
    return { success: 'Screenshot uploaded.' };
  } catch {
    await unlink(absolutePath).catch(() => {});
    return { error: 'Upload failed.' };
  }
}

export async function deleteScreenshot(screenshotId: string, findingId: string) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return;

  const parsed = deleteScreenshotSchema.safeParse({ screenshotId, findingId });
  if (!parsed.success) return;

  try {
    const screenshot = await prisma.screenshot.findUnique({
      where: { id: parsed.data.screenshotId },
      select: { id: true, findingId: true, filePath: true },
    });
    // Require the screenshot to belong to the stated finding (prevents cross-finding deletes)
    if (!screenshot || screenshot.findingId !== parsed.data.findingId) {
      return;
    }

    const filePath = resolveUploadFilePath(screenshot.filePath);
    if (filePath) {
      await unlink(filePath).catch(() => {});
    }
    await prisma.screenshot.delete({ where: { id: screenshot.id } });
    revalidatePath(`/dashboard/findings/${parsed.data.findingId}`);
  } catch (e) {
    console.error(e);
  }
}
