import type { Prisma } from '@prisma/client';
import { findingContent, WorkflowError } from '@/lib/reporting';

export const revisionInclude = {
  engagementContext: true,
  screenshots: {
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
  },
};

// All writing paths share this compare-and-swap and revision transaction, including evidence edits.
export async function changeFinding(
  tx: Prisma.TransactionClient,
  id: string,
  version: number,
  actorId: string,
  reason: string,
  change: (
    finding: Prisma.FindingGetPayload<{ include: typeof revisionInclude }>
  ) => Promise<void>
) {
  const previous = await tx.finding.findUnique({
    where: { id },
    include: revisionInclude,
  });
  if (!previous || previous.version !== version)
    throw new WorkflowError('This finding changed. Reload before saving.');
  if (version >= 1000)
    throw new WorkflowError(
      'This finding has reached its 1000-revision limit.'
    );
  const locked = await tx.finding.updateMany({
    where: { id, version },
    data: { version: { increment: 1 }, reviewStatus: 'Draft' },
  });
  if (locked.count !== 1)
    throw new WorkflowError('This finding changed. Reload before saving.');
  await tx.findingRevision.upsert({
    where: { findingId_version: { findingId: id, version } },
    update: {},
    create: {
      findingId: id,
      version,
      actorId,
      reason: 'Previous content',
      content: findingContent(previous),
    },
  });
  await change(previous);
  const current = await tx.finding.findUniqueOrThrow({
    where: { id },
    include: revisionInclude,
  });
  await tx.findingRevision.create({
    data: {
      findingId: id,
      version: current.version,
      actorId,
      reason,
      content: findingContent(current),
    },
  });
  return current;
}
