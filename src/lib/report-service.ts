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

export async function renderEngagementReport(
  tx: Prisma.TransactionClient,
  engagementId: string,
  final: boolean
) {
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
  let evidenceBytes = 0;
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
    const screenshots: ReportData['findings'][number]['screenshots'] = [];
    for (const screenshot of finding.screenshots) {
      if (++evidenceCount > 100)
        throw new WorkflowError(
          'A report can contain at most 100 evidence images.'
        );
      const path = resolveUploadFilePath(screenshot.filePath);
      if (!path) throw new WorkflowError('Evidence is unavailable.');
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
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
        const image = await normalizeScreenshot(await file.readFile());
        screenshots.push({
          id: screenshot.id,
          description: screenshot.description ?? '',
          data: image,
        });
      } finally {
        await file.close();
      }
    }
    data.findings.push({
      ...content,
      id,
      version: finding.version,
      screenshots,
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
    title: report.title,
  };
}
