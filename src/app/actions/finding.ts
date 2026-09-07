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
import { changeFinding } from '@/lib/finding-workflow';
import { versionSchema, WorkflowError } from '@/lib/reporting';
import { normalizeScreenshot } from '@/lib/normalize-screenshot';
import {
  assertScreenshotQuota,
  finishStagedScreenshotDeletion,
  getScreenshotStorageUsage,
  reconcileScreenshotStorage,
  restoreStagedScreenshotDeletion,
  ScreenshotQuotaError,
  stageScreenshotDeletion,
  type StagedScreenshotDeletion,
  withUploadsMaintenanceLock,
} from '@/lib/screenshot-storage';
import { assertFindingCreationCapacity } from '@/lib/finding-capacity';
import { logAuditEvent } from '@/lib/audit-log';

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

    await prisma.$transaction(async (tx) => {
      await assertFindingCreationCapacity(tx, engagementId, 1);
      await tx.finding.create({ data: { ...findingData, authorId: auth.userId } });
    });
  } catch (e) {
    if (e instanceof WorkflowError) return { error: e.message };
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

  const version = versionSchema.safeParse(formData.get('version'));
  if (!version.success) return { error: 'This finding changed. Reload before saving.' };

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

    let scopedEngagementId: string | null = null;
    await prisma.$transaction(async tx => {
      await changeFinding(tx, idParsed.data, version.data, auth.userId, 'Finding edited', async existing => {
        if (engagementId && engagementId !== existing.engagementId) throw new WorkflowError('Finding does not belong to this engagement.');
        scopedEngagementId = existing.engagementId;
        await tx.finding.update({ where: { id: idParsed.data }, data: { ...data, authorId: auth.userId } });
        if (engagementScoped && scopedEngagementId) await tx.engagementFindingContext.upsert({
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
      });
    });

    revalidatePath('/dashboard/findings');
    if (scopedEngagementId) {
      revalidatePath('/dashboard/engagements');
    }
    return { success: 'Finding updated successfully.' };
  } catch (e) {
    if (e instanceof WorkflowError) return { error: e.message };
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
      const staged: StagedScreenshotDeletion[] = [];
      try {
        for (const screenshot of screenshots) {
          const filePath = resolveUploadFilePath(screenshot.filePath);
          if (!filePath) throw new Error('Screenshot filename is invalid');
          const deletion = await stageScreenshotDeletion(filePath);
          if (deletion) staged.push(deletion);
        }

        await prisma.$transaction(async (tx) => {
          await tx.screenshot.deleteMany({ where: { findingId: idParsed.data } });
          await tx.finding.delete({ where: { id: idParsed.data } });
          if (record?.engagementId) {
            const report = await tx.engagementReport.findUnique({
              where: { engagementId: record.engagementId },
              select: { findingIds: true },
            });
            if (report?.findingIds.includes(idParsed.data)) {
              await tx.engagementReport.update({
                where: { engagementId: record.engagementId },
                data: {
                  findingIds: report.findingIds.filter((findingId) => findingId !== idParsed.data),
                  version: { increment: 1 },
                },
              });
            }
          }
        });
      } catch (error) {
        const restoreErrors: unknown[] = [];
        for (const deletion of [...staged].reverse()) {
          try {
            await restoreStagedScreenshotDeletion(deletion);
          } catch (restoreError) {
            restoreErrors.push(restoreError);
          }
        }
        if (restoreErrors.length) {
          throw new AggregateError(
            [error, ...restoreErrors],
            'Finding deletion failed and evidence recovery is pending.'
          );
        }
        throw error;
      }
      for (const deletion of staged) {
        try {
          await finishStagedScreenshotDeletion(deletion);
        } catch (error) {
          console.error('Evidence cleanup is pending; reconciliation will retry it.', error);
          await logAuditEvent('evidence.cleanup', auth.userId, 'failure');
        }
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

  const version = versionSchema.safeParse(formData.get('version'));
  if (!version.success) return { error: 'Reload this finding before uploading.' };
  const files = formData.getAll('screenshot');
  if (files.length < 1 || files.length > 4) return { error: 'Upload between 1 and 4 images at a time.' };
  const descriptionParsed = screenshotDescriptionSchema.safeParse(formData.get('description') ?? '');
  if (!descriptionParsed.success) return { error: 'Caption must be at most 500 characters.' };
  const description = descriptionParsed.data;
  const findingId = findingIdParsed.data;
  try {
    await withUploadsMaintenanceLock(async () => {
      const uploadsDirectory = await ensureUploadsDirectory();
      await reconcileScreenshotStorage(uploadsDirectory);
      const written: string[] = [];
      try {
        await prisma.$transaction(
          async (transaction) => {
            await changeFinding(transaction, findingId, version.data, auth.userId, 'Evidence uploaded', async () => {
              const [usage, count] = await Promise.all([
                getScreenshotStorageUsage(uploadsDirectory),
                transaction.screenshot.count({ where: { findingId } }),
              ]);
              let findingFiles = count;
              for (const file of files) {
                const fileResult = validateScreenshotUpload(file);
                if (!fileResult.ok) throw new WorkflowError(fileResult.error);
                const input = Buffer.from(await fileResult.file.arrayBuffer());
                const validation = validateScreenshotBuffer(input, fileResult.extension);
                if (!validation.ok) throw new WorkflowError(validation.error);
                const buffer = await normalizeScreenshot(input);
                const { absolutePath, fileName } = createUploadFilePath('png')!;
                const temporaryPath = join(dirname(absolutePath), `.${fileName}.tmp`);
                assertScreenshotQuota({
                  ...usage,
                  findingFiles,
                  uploadBytes: buffer.length,
                });
                written.push(temporaryPath, absolutePath);
                await writeFile(temporaryPath, buffer, { flag: 'wx', mode: 0o600 });
                await rename(temporaryPath, absolutePath);
                await transaction.screenshot.create({
                  data: {
                    findingId,
                    description,
                    filePath: fileName,
                    sortOrder: findingFiles,
                  },
                });
                usage.storedBytes += buffer.length;
                usage.storedFiles++;
                findingFiles++;
              }
              await transaction.finding.update({ where: { id: findingId }, data: { authorId: auth.userId } });
            });
          },
          { maxWait: 5_000, timeout: 30_000 }
        );
      } catch (error) {
        for (const path of written) await unlink(path).catch(() => {});
        throw error;
      }
    });
    revalidatePath('/dashboard', 'layout');
    return { success: 'Screenshot uploaded.' };
  } catch (error) {
    if (error instanceof ScreenshotQuotaError || error instanceof WorkflowError) {
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

  const version = versionSchema.safeParse(formData.get('version'));
  if (!version.success) redirect(`/dashboard/findings/${parsed.data.findingId}`);
  const result = await deleteScreenshot(parsed.data.screenshotId, parsed.data.findingId, version.data);
  if (result.error) {
    redirect(
      `/dashboard/findings/${parsed.data.findingId}?delete=${parsed.data.screenshotId}&deleteError=generic`,
    );
  }
  redirect(`/dashboard/findings/${parsed.data.findingId}`);
}

export async function deleteScreenshot(screenshotId: string, findingId: string, version: number): Promise<{ error?: string }> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const parsed = deleteScreenshotSchema.safeParse({ screenshotId, findingId });
  if (!parsed.success || !versionSchema.safeParse(version).success) return { error: 'Invalid screenshot.' };

  try {
    const deleted = await withUploadsMaintenanceLock(async () => {
      const screenshot = await prisma.screenshot.findUnique({
        where: { id: parsed.data.screenshotId },
        select: { id: true, findingId: true, filePath: true },
      });
      if (!screenshot || screenshot.findingId !== parsed.data.findingId) {
        return false;
      }

      const filePath = resolveUploadFilePath(screenshot.filePath);
      if (!filePath) throw new Error('Screenshot filename is invalid');
      const staged = await stageScreenshotDeletion(filePath);
      try {
        await prisma.$transaction(async tx => {
          await changeFinding(tx, findingId, version, auth.userId, 'Evidence deleted', async () => {
            await tx.screenshot.delete({ where: { id: screenshot.id } });
            await tx.finding.update({ where: { id: findingId }, data: { authorId: auth.userId } });
          });
        });
      } catch (error) {
        if (staged) await restoreStagedScreenshotDeletion(staged);
        throw error;
      }
      if (staged) {
        try {
          await finishStagedScreenshotDeletion(staged);
        } catch (error) {
          console.error('Evidence cleanup is pending; reconciliation will retry it.', error);
          await logAuditEvent('evidence.cleanup', auth.userId, 'failure');
        }
      }
      return true;
    });
    if (!deleted) return { error: 'Screenshot not found.' };
    revalidatePath('/dashboard', 'layout');
    return {};
  } catch (e) {
    console.error(e);
    return { error: 'Failed to delete screenshot.' };
  }
}
