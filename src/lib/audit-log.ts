import { getClientIp } from '@/lib/request-client-ip';

export type AuditAction =
  | 'db.export'
  | 'db.restore'
  | 'db.reset'
  | 'finding.save'
  | 'finding.review'
  | 'finding.import'
  | 'template.save'
  | 'report.issue'
  | 'report.download';

/**
 * Structured audit trail for destructive/sensitive admin operations.
 * Written to stdout so it is captured by whatever log collector runs the app.
 */
export async function logAuditEvent(
  action: AuditAction,
  userId: string,
  outcome: 'success' | 'failure'
): Promise<void> {
  const ip = await getClientIp().catch(() => 'unknown');
  console.log(
    JSON.stringify({
      audit: true,
      action,
      outcome,
      userId,
      ip,
      at: new Date().toISOString(),
    })
  );
}
