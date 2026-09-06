'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { requireAuth, isAuthError } from '@/lib/require-auth';
import {
  parseScannerExport,
  scannerFormats,
  importFingerprint,
  type ImportFinding,
} from '@/lib/scanner-import';
import { logAuditEvent } from '@/lib/audit-log';
import { consumeRateLimitAttempt } from '@/lib/auth/login-rate-limit';
import { assertFindingCreationCapacity } from '@/lib/finding-capacity';

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
    if (
      !(
        await consumeRateLimitAttempt(`scanner-import-preview:${actor.userId}`, {
          maxAttempts: 20,
          windowMs: 60_000,
        })
      ).allowed
    ) {
      return { error: 'Please wait before previewing another scanner export.' };
    }
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
    if (
      !(
        await consumeRateLimitAttempt(`scanner-import-confirm:${actor.userId}`, {
          maxAttempts: 5,
          windowMs: 60_000,
        })
      ).allowed
    ) {
      throw new Error('Scanner import rate limit reached.');
    }
    engagementId = z.uuid().parse(form.get('engagementId'));
    const format = z.enum(scannerFormats).parse(form.get('format'));
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1 || file.size > 2 * 1024 * 1024)
      throw new Error('Choose an export up to 2 MB.');
    const candidates = parseScannerExport(await file.text(), format);
    const selected = z
      .array(
        z.coerce
          .number()
          .int()
          .min(0)
          .max(Math.max(candidates.length - 1, 0))
      )
      .min(1)
      .max(500)
      .parse(form.getAll('selected'));
    await prisma.$transaction(
      async (tx) => {
        await tx.engagement.update({
          where: { id: engagementId },
          data: { updatedAt: new Date() },
        });
        const selectedCandidates = [...new Set(selected)]
          .map((index) => candidates[index])
          .filter((candidate): candidate is ImportFinding => Boolean(candidate));
        const fingerprints = selectedCandidates.map(importFingerprint);
        const existing = new Set(
          (
            await tx.finding.findMany({
              where: { engagementId, importFingerprint: { in: fingerprints } },
              select: { importFingerprint: true },
            })
          )
            .map((finding) => finding.importFingerprint)
            .filter((fingerprint): fingerprint is string => Boolean(fingerprint))
        );
        const fresh = selectedCandidates.filter(
          (candidate) => !existing.has(importFingerprint(candidate))
        );
        await assertFindingCreationCapacity(tx, engagementId, fresh.length);
        const rows = fresh.map((candidate) => {
          const {
            source: _source,
            sourceId: _sourceId,
            observation,
            affectedHosts,
            supportingLinks,
            ...content
          } = candidate;
          return {
            finding: {
              id: randomUUID(),
              ...content,
              supportingData: supportingLinks,
              authorId: actor.userId,
              engagementId,
              importFingerprint: importFingerprint(candidate),
            },
            observation,
            affectedHosts,
          };
        });
        if (rows.length) {
          const created = await tx.finding.createMany({
            data: rows.map((row) => row.finding),
          });
          if (created.count !== rows.length) throw new Error('Scanner import changed concurrently.');
          await tx.engagementFindingContext.createMany({
            data: rows.map((row) => ({
              engagementId,
              findingId: row.finding.id,
              observation: row.observation,
              affectedHosts: row.affectedHosts,
            })),
          });
          imported = rows.length;
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
