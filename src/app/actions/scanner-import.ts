'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAuth, isAuthError } from '@/lib/require-auth';
import { findingContentSchema } from '@/lib/reporting';
import {
  parseScannerExport,
  scannerFormats,
  importFingerprint,
  type ImportFinding,
} from '@/lib/scanner-import';
import { logAuditEvent } from '@/lib/audit-log';

export type ImportPreview = {
  error?: string;
  candidates?: ImportFinding[];
  duplicateCount?: number;
  engagementId?: string;
};

export async function previewScannerImport(
  _state: ImportPreview,
  form: FormData
): Promise<ImportPreview> {
  const actor = await requireAuth();
  if (isAuthError(actor)) return { error: 'Unauthorized' };
  try {
    const engagementId = z.uuid().parse(form.get('engagementId'));
    const format = z.enum(scannerFormats).parse(form.get('format'));
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1 || file.size > 2 * 1024 * 1024)
      return { error: 'Choose an export up to 2 MB.' };
    if (
      !(await prisma.engagement.findUnique({
        where: { id: engagementId },
        select: { id: true },
      }))
    )
      return { error: 'Engagement not found.' };
    let candidates: ImportFinding[];
    try {
      candidates = parseScannerExport(await file.text(), format);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message.slice(0, 200)
            : 'Invalid scanner export.',
      };
    }
    const duplicateCount = await prisma.finding.count({
      where: {
        engagementId,
        importFingerprint: { in: candidates.map(importFingerprint) },
      },
    });
    return {
      candidates,
      engagementId,
      duplicateCount,
    };
  } catch {
    return {
      error: 'Export could not be read. Verify the format and try again.',
    };
  }
}

export async function confirmScannerImport(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  let engagementId = '';
  let imported = 0;
  try {
    engagementId = z.uuid().parse(form.get('engagementId'));
    const payload = z
      .string()
      .max(4 * 1024 * 1024)
      .parse(form.get('candidates'));
    const candidates = z
      .array(
        findingContentSchema.extend({
          source: z.enum(scannerFormats),
          sourceId: z.string().max(500),
        })
      )
      .max(500)
      .parse(JSON.parse(payload));
    const selected = z
      .array(
        z.coerce
          .number()
          .int()
          .min(0)
          .max(candidates.length - 1)
      )
      .min(1)
      .max(500)
      .parse(form.getAll('selected'));
    await prisma.$transaction(
      async (tx) => {
        // Serializes concurrent imports into this engagement, including deduplication checks.
        await tx.engagement.update({
          where: { id: engagementId },
          data: { updatedAt: new Date() },
        });
        for (const index of new Set(selected)) {
          const candidate = candidates[index];
          const fingerprint = importFingerprint(candidate);
          if (
            await tx.finding.findUnique({
              where: {
                engagementId_importFingerprint: {
                  engagementId,
                  importFingerprint: fingerprint,
                },
              },
              select: { id: true },
            })
          )
            continue;
          const {
            source: _source,
            sourceId: _sourceId,
            observation,
            affectedHosts,
            supportingLinks,
            ...content
          } = candidate;
          await tx.finding.create({
            data: {
              ...content,
              supportingData: supportingLinks,
              authorId: actor.userId,
              engagementId,
              importFingerprint: fingerprint,
              engagementContext: {
                create: { engagementId, observation, affectedHosts },
              },
            },
          });
          imported++;
        }
      },
      { timeout: 30000 }
    );
  } catch {
    await logAuditEvent('finding.import', actor.userId, 'failure');
    redirect('/dashboard/imports?error=import');
  }
  await logAuditEvent('finding.import', actor.userId, 'success');
  revalidatePath('/dashboard', 'layout');
  redirect(
    `/dashboard/imports?engagement=${engagementId}&imported=${imported}`
  );
}
