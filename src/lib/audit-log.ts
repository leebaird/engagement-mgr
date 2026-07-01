import { getClientIp } from '@/lib/request-client-ip';

export type AuditAction =
  | 'db.export'
  | 'db.restore'
  | 'db.reset';

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
