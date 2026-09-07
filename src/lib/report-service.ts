import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  findingContent,
  readinessIssues,
  WorkflowError,
} from '@/lib/reporting';
import { generateReportPdf, type ReportData } from '@/lib/report-pdf';
import { resolveUploadFilePath } from '@/lib/uploads-path';
import { revisionInclude } from '@/lib/finding-workflow';
import { normalizeScreenshot } from '@/lib/normalize-screenshot';
import { MAX_FINDINGS_PER_ENGAGEMENT } from '@/lib/finding-capacity';

export async function loadReportEditorFindings(
  tx: Prisma.TransactionClient,
  engagementId: string,
  selectedIds: readonly string[]
) {
  const firstPage = await tx.finding.findMany({
    where: { engagementId },
    include: revisionInclude,
    orderBy: [{ title: 'asc' }, { id: 'asc' }],
    take: MAX_FINDINGS_PER_ENGAGEMENT + 1,
  });
  const findings = firstPage.slice(0, MAX_FINDINGS_PER_ENGAGEMENT);
  const visibleIds = new Set(findings.map((finding) => finding.id));
  const missingIds = selectedIds.filter((id) => !visibleIds.has(id));
  if (missingIds.length) {
    findings.push(...await tx.finding.findMany({
      where: { engagementId, id: { in: missingIds } },
      include: revisionInclude,
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      take: 100,
    }));
  }
  const availableIds = new Set(findings.map((finding) => finding.id));
  return {
    findings,
    hasMore: firstPage.length > MAX_FINDINGS_PER_ENGAGEMENT,
    selectionComplete: selectedIds.every((id) => availableIds.has(id)),
  };
}

export type ReportEvidenceFile = {
  findingIndex: number;
  id: string;
  description: string;
  path: string;
};

export type ReportBlueprint = {
  title: string;
  data: ReportData;
  evidence: ReportEvidenceFile[];
};

export function assertReportBlueprintUnchanged(
  expected: ReportBlueprint,
  current: ReportBlueprint
): void {
  if (JSON.stringify(current) !== JSON.stringify(expected)) {
    throw new WorkflowError(
      'A selected finding changed while the report was being issued. Preview the current report and try again.'
    );
  }
}

export async function collectEngagementReport(
  tx: Prisma.TransactionClient,
  engagementId: string,
  final: boolean
): Promise<ReportBlueprint> {
  const engagement = await tx.engagement.findUniqueOrThrow({
    where: { id: engagementId },
    include: { client: { select: { company: true } }, report: true },
  });
  const report = engagement.report;
  if (
    !report ||
    !report.findingIds.length ||
    report.findingIds.length > 100 ||
    new Set(report.findingIds).size !== report.findingIds.length
  )
    throw new WorkflowError(
      'Save a report containing between 1 and 100 distinct findings.'
    );
  if (final && !report.executiveSummary.trim())
    throw new WorkflowError('Add an executive summary before issuing.');
  const findings = await tx.finding.findMany({
    where: { id: { in: report.findingIds }, engagementId },
    include: revisionInclude,
  });
  if (findings.length !== report.findingIds.length)
    throw new WorkflowError(
      'A selected finding was removed or moved. Update the report selection.'
    );
  const data: ReportData = {
    title: report.title,
    executiveSummary: report.executiveSummary,
    client: engagement.client.company,
    codeName: engagement.codeName,
    objectives: engagement.objectives ?? '',
    targets: engagement.targets ?? '',
    exclusions: engagement.exclusions ?? '',
    startTesting: engagement.startTesting?.toISOString().slice(0, 10) ?? '',
    endTesting: engagement.endTesting?.toISOString().slice(0, 10) ?? '',
    findings: [],
  };
  const evidence: ReportEvidenceFile[] = [];
  let evidenceCount = 0;
  for (const id of report.findingIds) {
    const finding = findings.find((f) => f.id === id)!;
    const content = findingContent(finding);
    if (
      final &&
      (finding.reviewStatus !== 'Approved' ||
        readinessIssues(
          content,
          finding.screenshots.map((s) => s.description)
        ).length)
    )
      throw new WorkflowError(
        'Every selected finding must be approved and pass the readiness checks.'
      );
    const findingIndex = data.findings.length;
    data.findings.push({
      ...content,
      id,
      version: finding.version,
      screenshots: [],
    });
    for (const screenshot of finding.screenshots) {
      if (++evidenceCount > 100)
        throw new WorkflowError(
          'A report can contain at most 100 evidence images.'
        );
      const path = resolveUploadFilePath(screenshot.filePath);
      if (!path) throw new WorkflowError('Evidence is unavailable.');
      evidence.push({
        findingIndex,
        id: screenshot.id,
        description: screenshot.description ?? '',
        path,
      });
    }
  }
  return { title: report.title, data, evidence };
}

export async function readReportEvidence(
  evidence: ReportEvidenceFile[]
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  let evidenceBytes = 0;
  for (const item of evidence) {
    const file = await open(item.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stats = await file.stat();
      evidenceBytes += stats.size;
      if (
        !stats.isFile() ||
        stats.size > 5 * 1024 * 1024 ||
        evidenceBytes > 20 * 1024 * 1024
      )
        throw new WorkflowError(
          'Evidence exceeds report limits (5 MB per image, 20 MB total).'
        );
      buffers.push(await file.readFile());
    } finally {
      await file.close();
    }
  }
  return buffers;
}

export async function finishEngagementReport(
  blueprint: ReportBlueprint,
  rawEvidence: Buffer[],
  final: boolean
) {
  if (rawEvidence.length !== blueprint.evidence.length)
    throw new WorkflowError('Evidence is unavailable.');
  const data: ReportData = {
    ...blueprint.data,
    findings: blueprint.data.findings.map((finding) => ({
      ...finding,
      screenshots: [],
    })),
  };
  for (let i = 0; i < blueprint.evidence.length; i++) {
    const item = blueprint.evidence[i];
    data.findings[item.findingIndex].screenshots.push({
      id: item.id,
      description: item.description,
      data: await normalizeScreenshot(rawEvidence[i]),
    });
  }
  const pdf = await generateReportPdf(data, !final);
  const snapshot = {
    ...data,
    findings: data.findings.map((f) => ({
      ...f,
      screenshots: f.screenshots.map((s) => ({
        id: s.id,
        description: s.description,
        sha256: createHash('sha256').update(s.data).digest('hex'),
      })),
    })),
  };
  return {
    pdf,
    snapshot,
    sha256: createHash('sha256').update(pdf).digest('hex'),
    title: blueprint.title,
  };
}

export async function renderEngagementReport(
  tx: Prisma.TransactionClient,
  engagementId: string,
  final: boolean
) {
  const blueprint = await collectEngagementReport(tx, engagementId, final);
  const rawEvidence = await readReportEvidence(blueprint.evidence);
  return finishEngagementReport(blueprint, rawEvidence, final);
}
