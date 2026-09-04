import PDFDocument from 'pdfkit';
import { marked, type Token, type MarkedToken } from 'marked';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FindingContent } from '@/lib/reporting';

export type ReportData = {
  title: string;
  client: string;
  codeName: string;
  executiveSummary: string;
  objectives: string;
  targets: string;
  exclusions: string;
  startTesting: string;
  endTesting: string;
  findings: (FindingContent & {
    id: string;
    version: number;
    screenshots: { id: string; description: string; data: Buffer }[];
  })[];
};

function tokenText(token: Token, depth = 0): string {
  if (depth > 16) return '';
  if (token.type === 'image') return token.text;
  if (token.type === 'link')
    return `${token.tokens?.map((t) => tokenText(t, depth + 1)).join('') || token.text} (${token.href})`;
  if ('tokens' in token && token.tokens)
    return token.tokens.map((t) => tokenText(t, depth + 1)).join('');
  return 'text' in token ? String(token.text) : token.raw;
}

export async function generateReportPdf(
  report: ReportData,
  draft: boolean
): Promise<Buffer> {
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/DejaVuSans.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/DejaVuSans-Bold.ttf')),
  ]);
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    autoFirstPage: false,
    info: {
      Title: report.title,
      Author: 'Engagement Manager',
      Subject: draft
        ? 'DRAFT — not approved for delivery'
        : 'Confidential engagement report',
    },
  });
  const chunks: Buffer[] = [];
  let bytes = 0;
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 25 * 1024 * 1024)
        doc.destroy(new Error('Report exceeds the 25 MB output limit.'));
      else chunks.push(chunk);
    });
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  // Attach a handler immediately in case layout fails before awaiting the stream.
  void finished.catch(() => {});
  let page = 0;
  doc.registerFont('Body', regular).registerFont('Heading', bold);
  doc.on('pageAdded', () => {
    if (++page > 500) throw new Error('Report exceeds 500 pages.');
    doc
      .font('Body')
      .fontSize(8)
      .fillColor('#666666')
      .text(`${draft ? 'DRAFT · ' : ''}CONFIDENTIAL · ${page}`, 50, 25, {
        lineBreak: false,
      });
    doc.y = 55;
    doc.x = 50;
    doc.fontSize(10).fillColor('#111111');
  });
  const heading = (title: string) => {
    if (doc.y > 720) doc.addPage();
    doc
      .moveDown()
      .font('Heading')
      .fontSize(14)
      .text(title)
      .moveDown(0.4)
      .font('Body')
      .fontSize(10);
  };
  const blocks = (tokens: Token[], depth = 0) => {
    if (depth > 16) return;
    for (const token of tokens as MarkedToken[]) {
      if (token.type === 'space') continue;
      if (token.type === 'heading') heading(tokenText(token));
      else if (token.type === 'list')
        token.items.forEach((item, i) => {
          doc.text(
            `${token.ordered ? `${i + 1}.` : '•'} ${item.tokens.map((t) => tokenText(t)).join('\n')}`
          );
        });
      else if (token.type === 'blockquote') blocks(token.tokens, depth + 1);
      else if (token.type === 'table') {
        doc
          .font('Heading')
          .text(
            token.header
              .map((c) => c.tokens.map((t) => tokenText(t)).join(''))
              .join(' | ')
          )
          .font('Body');
        token.rows.forEach((row) =>
          doc.text(
            row
              .map((c) => c.tokens.map((t) => tokenText(t)).join(''))
              .join(' | ')
          )
        );
      } else doc.text(tokenText(token), { lineGap: 2 });
      doc.moveDown(0.4);
    }
  };
  const text = (value: string) => blocks(marked.lexer(value, { gfm: true }));
  try {
    doc.addPage();
    doc
      .font('Heading')
      .fontSize(24)
      .text(report.title)
      .moveDown()
      .font('Body')
      .fontSize(12);
    doc
      .text(report.client)
      .text(report.codeName)
      .text(
        `${report.startTesting || 'Unscheduled'} — ${report.endTesting || 'Unscheduled'}`
      );
    heading('Executive summary');
    text(report.executiveSummary);
    heading('Assessment objectives');
    text(report.objectives);
    heading('Scope');
    text(report.targets);
    heading('Exclusions');
    text(report.exclusions);
    heading('Finding summary');
    for (const severity of ['Critical', 'High', 'Medium', 'Low', 'Info'])
      doc.text(
        `${severity}: ${report.findings.filter((f) => f.severity === severity).length}`
      );
    report.findings.forEach((finding, index) =>
      doc.text(
        `${index + 1}. ${finding.title} (${finding.severity || 'Unrated'})`
      )
    );
    for (const [index, finding] of report.findings.entries()) {
      doc.addPage();
      heading(`${index + 1}. ${finding.title}`);
      doc.text(
        `Severity: ${finding.severity || 'Unrated'} · Category: ${finding.category}`
      );
      for (const [label, value] of [
        ['Observation and reproduction', finding.observation],
        ['Affected hosts', finding.affectedHosts],
        ['Background', finding.background],
        ['Remediation', finding.remediation],
        ['References', finding.supportingLinks],
      ]) {
        heading(label);
        text(value);
      }
      for (const [imageIndex, evidence] of finding.screenshots.entries()) {
        doc.addPage();
        heading(`Evidence ${index + 1}.${imageIndex + 1}`);
        doc.image(evidence.data, 50, doc.y, {
          fit: [495, 540],
          align: 'center',
        });
        doc.y += 550;
        doc.text(evidence.description);
      }
    }
    doc.end();
    return await finished;
  } catch (error) {
    doc.destroy();
    throw error;
  }
}
