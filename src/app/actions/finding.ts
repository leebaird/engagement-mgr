'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { rename, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { isAuthError, requireAuth } from '@/lib/require-auth';
import {
  createUploadFilePath,
  ensureUploadsDirectory,
  resolveUploadFilePath,
} from '@/lib/uploads-path';
import { firstZodError, uuidSchema } from '@/lib/validation/common';
import {
  createFindingSchema,
  deleteScreenshotSchema,
  findingSearchQuerySchema,
  screenshotDescriptionSchema,
  updateFindingSchema,
} from '@/lib/validation/finding';
import { validateScreenshotBuffer, validateScreenshotUpload } from '@/lib/validation/upload';
import { redirect } from 'next/navigation';
import { finishDetailDelete, finishDetailUpdate, listParamsFromForm, updateErrorCode } from '@/lib/detail-delete-form';
import { buildPathQuery } from '@/lib/list-view-params';
import {
  assertScreenshotQuota,
  getScreenshotStorageUsage,
  ScreenshotQuotaError,
  withUploadsMaintenanceLock,
} from '@/lib/screenshot-storage';

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
  } catch (e) {
    console.error('Create Finding error:', e);
    return { error: 'Failed to create finding.' };
  }

  revalidatePath('/dashboard/findings');
  if (engagementId) {
    revalidatePath('/dashboard/engagements');
    redirect(buildPathQuery('/dashboard/engagements', listParamsFromForm(formData), {
      detail: engagementId,
      findings: '1',
      createFinding: null,
      finding: null,
      edit: null,
      delete: null,
    }));
  }
  redirect(buildPathQuery('/dashboard/findings', listParamsFromForm(formData), { create: null }));
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
  const engagementId = formData.get('engagementId')?.toString();
  const result = await updateFinding(id, {}, formData);
  const code = updateErrorCode(result.error);
  if (engagementId && formData.get('engagementScoped')?.toString() === 'true') {
    finishDetailUpdate('/dashboard/engagements', formData, engagementId, result, code, ['finding']);
    return;
  }
  finishDetailUpdate('/dashboard/findings', formData, id, result, code);
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
    const finding = await withUploadsMaintenanceLock(async () => {
      const [screenshots, record] = await Promise.all([
        prisma.screenshot.findMany({
          where: { findingId: idParsed.data },
        }),
        prisma.finding.findUnique({
          where: { id: idParsed.data },
          select: { engagementId: true },
        }),
      ]);
      await prisma.$transaction([
        prisma.screenshot.deleteMany({ where: { findingId: idParsed.data } }),
        prisma.finding.delete({ where: { id: idParsed.data } }),
      ]);
      for (const screenshot of screenshots) {
        const filePath = resolveUploadFilePath(screenshot.filePath);
        if (filePath) await unlink(filePath).catch(() => {});
      }
      return record;
    });
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
  const temporaryFileName = `.${fileName}.tmp`;
  const temporaryPath = join(dirname(absolutePath), temporaryFileName);

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
    const uploadsDirectory = await ensureUploadsDirectory();
    await withUploadsMaintenanceLock(async () => {
      try {
        await prisma.$transaction(
          async (transaction) => {
            const [{ storedBytes, storedFiles }, findingFiles] = await Promise.all([
              getScreenshotStorageUsage(uploadsDirectory),
              transaction.screenshot.count({ where: { findingId } }),
            ]);
            assertScreenshotQuota({
              storedBytes,
              storedFiles,
              findingFiles,
              uploadBytes: buffer.length,
            });

            await writeFile(temporaryPath, buffer, { flag: 'wx', mode: 0o600 });
            await rename(temporaryPath, absolutePath);
            await transaction.screenshot.create({
              data: {
                findingId,
                description,
                filePath: fileName,
              },
            });
          },
          { maxWait: 5_000, timeout: 30_000 }
        );
      } catch (error) {
        await unlink(temporaryPath).catch(() => {});
        await unlink(absolutePath).catch(() => {});
        throw error;
      }
    });
    revalidatePath(`/dashboard/findings/${findingId}`);
    return { success: 'Screenshot uploaded.' };
  } catch (error) {
    if (error instanceof ScreenshotQuotaError) {
      return { error: error.message };
    }
    return { error: 'Upload failed.' };
  }
}

export async function deleteScreenshotFromPage(formData: FormData): Promise<void> {
  const screenshotId = formData.get('screenshotId')?.toString() ?? '';
  const findingId = formData.get('findingId')?.toString() ?? '';
  const parsed = deleteScreenshotSchema.safeParse({ screenshotId, findingId });
  if (!parsed.success) {
    redirect('/dashboard/findings');
  }

  const result = await deleteScreenshot(parsed.data.screenshotId, parsed.data.findingId);
  if (result.error) {
    redirect(
      `/dashboard/findings/${parsed.data.findingId}?delete=${parsed.data.screenshotId}&deleteError=generic`,
    );
  }
  redirect(`/dashboard/findings/${parsed.data.findingId}`);
}

export async function deleteScreenshot(screenshotId: string, findingId: string): Promise<{ error?: string }> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const parsed = deleteScreenshotSchema.safeParse({ screenshotId, findingId });
  if (!parsed.success) return { error: 'Invalid screenshot.' };

  try {
    const deleted = await withUploadsMaintenanceLock(async () => {
      const screenshot = await prisma.screenshot.findUnique({
        where: { id: parsed.data.screenshotId },
        select: { id: true, findingId: true, filePath: true },
      });
      if (!screenshot || screenshot.findingId !== parsed.data.findingId) {
        return false;
      }

      await prisma.screenshot.delete({ where: { id: screenshot.id } });
      const filePath = resolveUploadFilePath(screenshot.filePath);
      if (filePath) await unlink(filePath).catch(() => {});
      return true;
    });
    if (!deleted) return { error: 'Screenshot not found.' };
    revalidatePath(`/dashboard/findings/${parsed.data.findingId}`);
    return {};
  } catch (e) {
    console.error(e);
    return { error: 'Failed to delete screenshot.' };
  }
}
