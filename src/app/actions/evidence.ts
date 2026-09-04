'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuth, isAuthError } from '@/lib/require-auth';
import { prisma } from '@/lib/db';
import { changeFinding } from '@/lib/finding-workflow';
import { versionSchema } from '@/lib/reporting';
import { withUploadsMaintenanceLock } from '@/lib/screenshot-storage';

export async function updateEvidence(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  const parsed = z
    .object({
      id: z.uuid(),
      version: versionSchema,
      screenshotId: z.uuid(),
      description: z.string().max(500),
      sortOrder: z.coerce.number().int().min(0).max(10000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/dashboard/findings');
  const { id, version, screenshotId, description, sortOrder } = parsed.data;
  try {
    await withUploadsMaintenanceLock(() =>
      prisma.$transaction(async (tx) => {
        await changeFinding(
          tx,
          id,
          version,
          actor.userId,
          'Evidence caption or order edited',
          async () => {
            if (
              (
                await tx.screenshot.updateMany({
                  where: { id: screenshotId, findingId: id },
                  data: { description, sortOrder },
                })
              ).count !== 1
            )
              throw new Error('Evidence not found');
            await tx.finding.update({
              where: { id },
              data: { authorId: actor.userId },
            });
          }
        );
      })
    );
  } catch {
    redirect(`/dashboard/findings/${id}/write?error=evidence`);
  }
  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/findings/${id}/write`);
}
