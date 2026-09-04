'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAuth, isAuthError } from '@/lib/require-auth';
import { changeFinding } from '@/lib/finding-workflow';
import {
  contentFields,
  findingContent,
  findingContentSchema,
  mayReview,
  readinessIssues,
  versionSchema,
  WorkflowError,
} from '@/lib/reporting';
import { logAuditEvent } from '@/lib/audit-log';

const requestSchema = z.object({ id: z.uuid(), version: versionSchema });

export async function saveWriting(
  _state: unknown,
  form: FormData
): Promise<{ error?: string }> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  const request = requestSchema.safeParse(Object.fromEntries(form));
  if (!request.success) redirect('/dashboard/findings');
  const { id, version } = request.data;
  try {
    const content = findingContentSchema.parse(
      Object.fromEntries(contentFields.map((key) => [key, form.get(key) ?? '']))
    );
    await prisma.$transaction(async (tx) => {
      await changeFinding(
        tx,
        id,
        version,
        actor.userId,
        'Writing saved',
        async (finding) => {
          const { observation, affectedHosts, supportingLinks, ...fields } =
            content;
          await tx.finding.update({
            where: { id },
            data: {
              ...fields,
              supportingData: supportingLinks,
              authorId: actor.userId,
            },
          });
          if (finding.engagementId)
            await tx.engagementFindingContext.upsert({
              where: { findingId: id },
              create: {
                findingId: id,
                engagementId: finding.engagementId,
                observation,
                affectedHosts,
              },
              update: { observation, affectedHosts },
            });
        }
      );
      await tx.findingDraft.deleteMany({
        where: {
          findingId: id,
          userId: actor.userId,
          version: z.coerce
            .number()
            .int()
            .min(0)
            .parse(form.get('draftVersion')),
        },
      });
    });
  } catch (e) {
    return {
      error:
        e instanceof WorkflowError
          ? `${e.message} Your writing is still in this editor. Save a private draft before reloading and comparing revisions.`
          : 'Could not save this finding. Your writing is still in this editor; check your input and retry.',
    };
  }
  await logAuditEvent('finding.save', actor.userId, 'success');
  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/findings/${id}/write?saved=${version + 1}`);
}

export async function saveDraft(
  _state: unknown,
  form: FormData
): Promise<{ error?: string; savedAt?: string; version?: number }> {
  const draftVersion = z.coerce
    .number()
    .int()
    .min(0)
    .max(2147483646)
    .safeParse(form.get('draftVersion'));
  const retryVersion = draftVersion.success ? draftVersion.data : undefined;
  const actor = await requireAuth();
  if (isAuthError(actor))
    return {
      error: 'Sign in again before saving your draft.',
      version: retryVersion,
    };
  try {
    if (!draftVersion.success)
      throw new WorkflowError('Invalid draft version. Reload before saving.');
    const { id, version } = requestSchema.parse(Object.fromEntries(form));
    const content = findingContentSchema.parse(
      Object.fromEntries(contentFields.map((key) => [key, form.get(key) ?? '']))
    );
    const draft = await prisma.$transaction(async (tx) => {
      const finding = await tx.finding.findUnique({
        where: { id },
        select: { version: true },
      });
      if (!finding) throw new WorkflowError('Finding no longer exists.');
      if (!draftVersion.data)
        return tx.findingDraft.create({
          data: {
            findingId: id,
            userId: actor.userId,
            baseVersion: version,
            content,
          },
        });
      const result = await tx.findingDraft.updateMany({
        where: {
          findingId: id,
          userId: actor.userId,
          version: draftVersion.data,
        },
        data: { content, baseVersion: version, version: { increment: 1 } },
      });
      if (result.count !== 1)
        throw new WorkflowError(
          'Your draft changed in another tab. Reload before saving.'
        );
      return tx.findingDraft.findUniqueOrThrow({
        where: { findingId_userId: { findingId: id, userId: actor.userId } },
      });
    });
    return { savedAt: draft.updatedAt.toISOString(), version: draft.version };
  } catch (e) {
    return {
      version: retryVersion,
      error:
        e instanceof WorkflowError
          ? e.message
          : 'Draft could not be saved. Keep this page open and retry.',
    };
  }
}

export async function discardDraft(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  const parsed = z.uuid().safeParse(form.get('id'));
  if (!parsed.success) redirect('/dashboard/findings');
  try {
    const version = versionSchema.parse(form.get('draftVersion'));
    const deleted = await prisma.findingDraft.deleteMany({
      where: { findingId: parsed.data, userId: actor.userId, version },
    });
    if (deleted.count !== 1) throw new WorkflowError('Draft changed.');
  } catch {
    redirect(
      `/dashboard/findings/${parsed.data}/write?message=${encodeURIComponent('Draft could not be discarded. Reload and check for changes in another tab.')}`
    );
  }
  redirect(`/dashboard/findings/${parsed.data}/write`);
}

export async function reviewFinding(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  const parsed = requestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/dashboard/reviews');
  const { id, version } = parsed.data;
  let error = '';
  try {
    const status = z
      .enum(['Ready', 'ChangesRequested', 'Approved'])
      .parse(form.get('status'));
    await prisma.$transaction(async (tx) => {
      await changeFinding(
        tx,
        id,
        version,
        actor.userId,
        `Review: ${status}`,
        async (finding) => {
          if (!finding.engagementId)
            throw new WorkflowError(
              'Assign the finding to an engagement before review.'
            );
          if (status === 'Ready') {
            if (!['Draft', 'ChangesRequested'].includes(finding.reviewStatus))
              throw new WorkflowError('Invalid review transition.');
            if (
              readinessIssues(
                findingContent(finding),
                finding.screenshots.map((s) => s.description)
              ).length
            )
              throw new WorkflowError(
                'Complete the readiness checklist before review.'
              );
          } else if (
            finding.reviewStatus !== 'Ready' ||
            !mayReview(actor, finding)
          )
            throw new WorkflowError(
              'Only an independent assigned reviewer or administrator can review a ready finding.'
            );
          await tx.finding.update({
            where: { id },
            data: { reviewStatus: status },
          });
        }
      );
    });
  } catch (e) {
    error =
      e instanceof WorkflowError ? e.message : 'Review could not be updated.';
  }
  await logAuditEvent(
    'finding.review',
    actor.userId,
    error ? 'failure' : 'success'
  );
  revalidatePath('/dashboard', 'layout');
  redirect(
    `/dashboard/findings/${id}/write${error ? `?message=${encodeURIComponent(error)}` : ''}`
  );
}

export async function assignReviewer(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor) || actor.role !== 'Admin')
    redirect('/dashboard/reviews');
  const parsed = requestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/dashboard/reviews');
  const { id, version } = parsed.data;
  try {
    const reviewerId = z.uuid().parse(form.get('reviewerId'));
    await prisma.$transaction(async (tx) => {
      await changeFinding(
        tx,
        id,
        version,
        actor.userId,
        'Reviewer assigned',
        async (finding) => {
          if (reviewerId === finding.authorId)
            throw new WorkflowError('Choose someone other than the author.');
          await tx.finding.update({
            where: { id },
            data: {
              reviewerId,
              reviewStatus:
                finding.reviewStatus === 'Approved'
                  ? 'Ready'
                  : finding.reviewStatus,
            },
          });
        }
      );
    });
  } catch {
    redirect(`/dashboard/findings/${id}/write?error=reviewer`);
  }
  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/findings/${id}/write`);
}

export async function addFindingComment(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  const parsed = z
    .object({ id: z.uuid(), body: z.string().trim().min(1).max(4000) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/dashboard/reviews');
  const { id, body } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.finding.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      if ((await tx.findingComment.count({ where: { findingId: id } })) >= 500)
        throw new WorkflowError('Comment limit reached.');
      const user = await tx.user.findUniqueOrThrow({
        where: { id: actor.userId },
        select: { username: true },
      });
      await tx.findingComment.create({
        data: {
          findingId: id,
          actorId: actor.userId,
          username: user.username,
          body,
        },
      });
    });
  } catch {
    redirect(`/dashboard/findings/${id}/write?error=comment`);
  }
  revalidatePath(`/dashboard/findings/${id}/write`);
  redirect(`/dashboard/findings/${id}/write`);
}

export async function restoreFindingRevision(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  const parsed = requestSchema
    .extend({ revisionId: z.uuid() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/dashboard/findings');
  const { id, version, revisionId } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const revision = await tx.findingRevision.findFirstOrThrow({
        where: { id: revisionId, findingId: id },
      });
      const content = findingContentSchema.parse(revision.content);
      await changeFinding(
        tx,
        id,
        version,
        actor.userId,
        `Restored text from revision ${revision.version}`,
        async (finding) => {
          const { observation, affectedHosts, supportingLinks, ...fields } =
            content;
          await tx.finding.update({
            where: { id },
            data: {
              ...fields,
              supportingData: supportingLinks,
              authorId: actor.userId,
            },
          });
          if (finding.engagementId)
            await tx.engagementFindingContext.upsert({
              where: { findingId: id },
              create: {
                findingId: id,
                engagementId: finding.engagementId,
                observation,
                affectedHosts,
              },
              update: { observation, affectedHosts },
            });
        }
      );
    });
  } catch {
    redirect(`/dashboard/findings/${id}/write?error=restore`);
  }
  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/findings/${id}/write`);
}
