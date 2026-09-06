import { z } from 'zod';
import { createHash, timingSafeEqual } from 'node:crypto';
import { requireAuth, isAuthError } from '@/lib/require-auth';
import { prisma } from '@/lib/db';
import { withUploadsMaintenanceLock } from '@/lib/screenshot-storage';
import {
  collectEngagementReport,
  finishEngagementReport,
  readReportEvidence,
} from '@/lib/report-service';
import { logAuditEvent } from '@/lib/audit-log';
import { consumeRateLimitAttempt } from '@/lib/auth/login-rate-limit';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  const actor = await requireAuth();
  if (isAuthError(actor))
    return new Response('Unauthorized', { status: 401, headers });
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return new Response('Not found', { status: 404, headers });
  try {
    const draft = new URL(request.url).searchParams.get('preview') === '1';
    let pdf: Uint8Array;
    if (draft) {
      if (
        !(
          await consumeRateLimitAttempt(`report-preview:${actor.userId}`, {
            maxAttempts: 10,
            windowMs: 60000,
          })
        ).allowed
      )
        return new Response('Please wait before generating another preview.', {
          status: 429,
          headers: { ...headers, 'Retry-After': '60' },
        });
      const blueprint = await prisma.$transaction(
        (tx) => collectEngagementReport(tx, id.data, false),
        { isolationLevel: 'RepeatableRead', timeout: 15000 }
      );
      const rawEvidence = await withUploadsMaintenanceLock(() =>
        readReportEvidence(blueprint.evidence)
      );
      pdf = (await finishEngagementReport(blueprint, rawEvidence, false)).pdf;
    } else {
      const report = await prisma.issuedReport.findUnique({
        where: { id: id.data },
        select: { pdf: true, sha256: true },
      });
      if (!report) return new Response('Not found', { status: 404, headers });
      const actual = createHash('sha256').update(report.pdf).digest();
      const expected = Buffer.from(report.sha256, 'hex');
      if (
        expected.length !== actual.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new Error('Report integrity mismatch');
      pdf = report.pdf;
    }
    await logAuditEvent('report.download', actor.userId, 'success');
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${draft ? 'draft' : 'report'}-${id.data}.pdf"`,
        'Content-Length': String(pdf.byteLength),
      },
    });
  } catch {
    await logAuditEvent('report.download', actor.userId, 'failure');
    return new Response(
      'Report unavailable. Check its selected findings and evidence, or retry after maintenance.',
      { status: 409, headers }
    );
  }
}
