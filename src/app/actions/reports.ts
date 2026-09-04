'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAuth, isAuthError } from '@/lib/require-auth';
import { withUploadsMaintenanceLock } from '@/lib/screenshot-storage';
import { renderEngagementReport } from '@/lib/report-service';
import { WorkflowError } from '@/lib/reporting';
import { logAuditEvent } from '@/lib/audit-log';
import { consumeRateLimitAttempt } from '@/lib/auth/login-rate-limit';

export async function saveReport(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  const id = z.uuid().safeParse(form.get('engagementId'));
  if (!id.success) redirect('/dashboard/reports');
  let error = '';
  try {
    const title = z.string().trim().min(1).max(200).parse(form.get('title'));
    const executiveSummary = z
      .string()
      .max(10000)
      .parse(form.get('executiveSummary'));
    const version = z.coerce
      .number()
      .int()
      .min(0)
      .max(2147483646)
      .parse(form.get('version'));
    const selected = z
      .array(z.uuid())
      .min(1)
      .max(100)
      .parse(form.getAll('findingId'));
    const findingIds = [...new Set(selected)].sort((a, b) => {
      const order = (key: string) =>
        z.coerce
          .number()
          .int()
          .min(0)
          .max(10000)
          .parse(form.get(`order-${key}`));
      return order(a) - order(b);
    });
    await prisma.$transaction(async (tx) => {
      if (
        (await tx.finding.count({
          where: { engagementId: id.data, id: { in: findingIds } },
        })) !== findingIds.length
      )
        throw new WorkflowError('Select findings from this engagement only.');
      const data = { title, executiveSummary, findingIds };
      if (!version)
        await tx.engagementReport.create({
          data: { engagementId: id.data, ...data },
        });
      else if (
        (
          await tx.engagementReport.updateMany({
            where: { engagementId: id.data, version },
            data: { ...data, version: { increment: 1 } },
          })
        ).count !== 1
      )
        throw new WorkflowError(
          'The report changed in another tab. Reload before saving.'
        );
    });
  } catch (e) {
    error =
      e instanceof WorkflowError
        ? e.message
        : 'Could not save the report. Check the fields and reload if another user changed it.';
  }
  revalidatePath('/dashboard/reports');
  redirect(
    `/dashboard/reports?engagement=${id.data}${error ? `&message=${encodeURIComponent(error)}` : '&saved=1'}`
  );
}

export async function issueReport(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor) || actor.role !== 'Admin')
    redirect('/dashboard/reports');
  const id = z.uuid().safeParse(form.get('engagementId'));
  if (!id.success) redirect('/dashboard/reports');
  let error = '';
  try {
    const version = z.coerce.number().int().min(1).parse(form.get('version'));
    if (
      !(
        await consumeRateLimitAttempt(`report-issue:${actor.userId}`, {
          maxAttempts: 5,
          windowMs: 60000,
        })
      ).allowed
    )
      throw new WorkflowError('Please wait before issuing another report.');
    if (form.get('confirm') !== 'on')
      throw new WorkflowError('Confirm that this report is ready to issue.');
    await withUploadsMaintenanceLock(() =>
      prisma.$transaction(
        async (tx) => {
          const settings = await tx.engagementReport.findUniqueOrThrow({
            where: { engagementId: id.data },
          });
          if (settings.version !== version)
            throw new WorkflowError(
              'Report settings changed. Preview the current report before issuing.'
            );
          const count = await tx.issuedReport.count({
            where: { engagementId: id.data },
          });
          if (count >= 50)
            throw new WorkflowError(
              'This engagement has reached the 50 issued-report limit.'
            );
          const totals = await tx.$queryRaw<
            { bytes: bigint }[]
          >`SELECT COALESCE(SUM(octet_length("pdf")), 0)::bigint AS bytes FROM "IssuedReport"`;
          if (Number(totals[0].bytes) > 1024 * 1024 * 1024 - 25 * 1024 * 1024)
            throw new WorkflowError('Issued report storage limit reached.');
          const rendered = await renderEngagementReport(tx, id.data, true);
          await tx.issuedReport.create({
            data: {
              engagementId: id.data,
              version: count + 1,
              issuedBy: actor.userId,
              ...rendered,
              pdf: new Uint8Array(rendered.pdf),
            },
          });
        },
        { isolationLevel: 'Serializable', timeout: 60000 }
      )
    );
  } catch (e) {
    error =
      e instanceof WorkflowError
        ? e.message
        : 'Report could not be issued. Check evidence files and retry; concurrent edits require a fresh preview.';
  }
  await logAuditEvent(
    'report.issue',
    actor.userId,
    error ? 'failure' : 'success'
  );
  revalidatePath('/dashboard/reports');
  redirect(
    `/dashboard/reports?engagement=${id.data}${error ? `&message=${encodeURIComponent(error)}` : '&issued=1'}`
  );
}
