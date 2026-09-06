import type { Prisma } from '@prisma/client';
import { WorkflowError } from '@/lib/reporting';

export const MAX_TOTAL_FINDINGS = 10_000;
export const MAX_FINDINGS_PER_ENGAGEMENT = 500;
const FINDING_CAPACITY_LOCK_ID = 1_394_517_094;

export function assertFindingCapacityCounts(options: {
  totalFindings: number;
  engagementFindings: number;
  newFindings: number;
  hasEngagement: boolean;
}): void {
  if (options.newFindings < 1) return;
  if (options.totalFindings + options.newFindings > MAX_TOTAL_FINDINGS) {
    throw new WorkflowError(
      `The application can contain at most ${MAX_TOTAL_FINDINGS} findings.`
    );
  }
  if (
    options.hasEngagement &&
    options.engagementFindings + options.newFindings > MAX_FINDINGS_PER_ENGAGEMENT
  ) {
    throw new WorkflowError(
      `An engagement can contain at most ${MAX_FINDINGS_PER_ENGAGEMENT} findings.`
    );
  }
}

export async function assertFindingCreationCapacity(
  tx: Prisma.TransactionClient,
  engagementId: string | null | undefined,
  newFindings: number
): Promise<void> {
  if (newFindings < 1) return;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FINDING_CAPACITY_LOCK_ID}::integer)`;
  const totalFindings = await tx.finding.count();
  const engagementFindings = engagementId
    ? await tx.finding.count({ where: { engagementId } })
    : 0;
  assertFindingCapacityCounts({
    totalFindings,
    engagementFindings,
    newFindings,
    hasEngagement: Boolean(engagementId),
  });
}
