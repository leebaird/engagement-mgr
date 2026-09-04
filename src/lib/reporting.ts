import { z } from 'zod';

export const findingContentSchema = z.object({
  title: z.string().trim().min(1).max(500),
  category: z.string().trim().max(200),
  severity: z.enum(['', 'Info', 'Low', 'Medium', 'High', 'Critical']),
  background: z.string().max(10000),
  remediation: z.string().max(10000),
  supportingLinks: z.string().max(10000),
  observation: z.string().max(10000),
  affectedHosts: z.string().max(10000),
});
export type FindingContent = z.infer<typeof findingContentSchema>;
export const contentFields = [
  'title',
  'category',
  'severity',
  'background',
  'remediation',
  'supportingLinks',
  'observation',
  'affectedHosts',
] as const;
export const reviewStatuses = [
  'Draft',
  'Ready',
  'ChangesRequested',
  'Approved',
] as const;
export const versionSchema = z.coerce.number().int().min(1).max(2147483646);

export function findingContent(record: {
  title: string;
  category: string | null;
  severity: string;
  background: string | null;
  remediation: string | null;
  supportingData: string | null;
  engagementContext?: {
    observation: string | null;
    affectedHosts: string | null;
  } | null;
}): FindingContent {
  return findingContentSchema.parse({
    title: record.title,
    category: record.category ?? '',
    severity: record.severity,
    background: record.background ?? '',
    remediation: record.remediation ?? '',
    supportingLinks: record.supportingData ?? '',
    observation: record.engagementContext?.observation ?? '',
    affectedHosts: record.engagementContext?.affectedHosts ?? '',
  });
}

export function readinessIssues(
  content: FindingContent,
  captions: (string | null)[] = []
): string[] {
  const issues: string[] = [];
  for (const key of [
    'severity',
    'observation',
    'remediation',
    'affectedHosts',
  ] as const) {
    if (!content[key].trim())
      issues.push(
        `Missing ${key === 'affectedHosts' ? 'affected hosts' : key}.`
      );
  }
  if (
    Object.values(content).some((value) =>
      /\{\{[^}]+\}\}|\[INSERT\b|\bTODO\b|\bTBD\b/i.test(value)
    )
  ) {
    issues.push('Unresolved template placeholders.');
  }
  if (captions.some((caption) => !caption?.trim()))
    issues.push('An evidence caption is missing.');
  return issues;
}

export class WorkflowError extends Error {}

export function mayReview(
  actor: { userId: string; role: string },
  finding: { authorId: string | null; reviewerId: string | null }
): boolean {
  return (
    actor.userId !== finding.authorId &&
    (actor.role === 'Admin' || actor.userId === finding.reviewerId)
  );
}
