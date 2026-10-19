import { getClientIp } from '@/lib/request-client-ip';

export type AuditAction =
  | 'db.export'
  | 'db.restore'
  | 'db.reset'
  | 'finding.save'
  | 'finding.review'
  | 'finding.import'
  | 'evidence.cleanup'
  | 'template.save'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'report.issue'
  | 'report.download';

/**
 * Structured audit trail for destructive/sensitive admin operations.
 * Written to stdout so it is captured by whatever log collector runs the app.
 */
export async function logAuditEvent(
  action: AuditAction,
  userId: string,
  outcome: 'success' | 'failure',
  // Identifiers and flags only; never passwords, tokens or finding text.
  details?: Record<string, string | boolean>
): Promise<void> {
  const ip = await getClientIp().catch(() => 'unknown');
  console.log(
    JSON.stringify({
      audit: true,
      action,
      outcome,
      userId,
      ...(details && { details }),
      ip,
      at: new Date().toISOString(),
    })
  );
}
