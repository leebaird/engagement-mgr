import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FindingMarkdown } from '@/components/FindingMarkdown';
import { findingContentSchema, readinessIssues, mayReview } from './reporting';
import { generateReportPdf } from './report-pdf';
import { normalizeScreenshot } from './normalize-screenshot';
import sharp from 'sharp';

const content = {
  title: 'Finding',
  category: 'Web',
  severity: 'High' as const,
  background: 'Details',
  remediation: 'Fix',
  observation: 'Observed',
  affectedHosts: 'example.test',
  supportingLinks: '',
};

describe('reporting security and content', () => {
  it('requires complete finding content and flags unresolved placeholders and captions', () => {
    assert.deepEqual(readinessIssues(content, ['Evidence']), []);
    const issues = readinessIssues(
      { ...content, observation: '', remediation: '{{remediation}}' },
      ['']
    );
    assert.equal(issues.length, 3);
    assert.equal(
      findingContentSchema.safeParse({ ...content, severity: 'Unknown' })
        .success,
      false
    );
  });
  it('allows only an independent assigned reviewer or administrator to approve', () => {
    const finding = { authorId: 'author', reviewerId: 'reviewer' };
    assert.equal(
      mayReview({ userId: 'author', role: 'Admin' }, finding),
      false
    );
    assert.equal(mayReview({ userId: 'other', role: 'User' }, finding), false);
    assert.equal(
      mayReview({ userId: 'reviewer', role: 'User' }, finding),
      true
    );
    assert.equal(mayReview({ userId: 'admin', role: 'Admin' }, finding), true);
  });
  it('renders useful Markdown while preventing HTML, active links and remote images', () => {
    const html = renderToStaticMarkup(
      createElement(FindingMarkdown, {
        text: '**Evidence**\n\n<script>alert(1)</script>\n\n[link](javascript:alert(1)) ![secret](http://127.0.0.1/private)\n\n```http\nGET /test\n```',
      })
    );
    assert.match(html, /<strong>Evidence<\/strong>/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script|<img|href=|src=/);
    assert.match(html, /<pre><code>GET \/test/);
  });
  it('produces a real PDF from structured data with no active links', async () => {
    const pdf = await generateReportPdf(
      {
        title: 'Assessment — café',
        client: 'Client',
        codeName: 'Test',
        executiveSummary: 'Summary',
        objectives: 'Objectives',
        targets: 'example.test',
        exclusions: 'Other systems',
        startTesting: '',
        endTesting: '',
        findings: [
          {
            ...content,
            id: 'test',
            version: 1,
            supportingLinks: '[bad](javascript:alert(1))',
            screenshots: [],
          },
        ],
      },
      true
    );
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.doesNotMatch(
      pdf.toString('latin1'),
      /\/JavaScript|\/Launch|\/URI\b|\/EmbeddedFile/
    );
    assert.ok(pdf.length > 1000);
  });
  it('decodes and normalizes images and rejects fake or oversized pixel payloads', async () => {
    const jpeg = await sharp({
      create: { width: 10, height: 10, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .toBuffer();
    const png = await normalizeScreenshot(jpeg);
    assert.equal((await sharp(png).metadata()).format, 'png');
    await assert.rejects(normalizeScreenshot(Buffer.from('not an image')));
    const large = await sharp({
      create: { width: 4100, height: 4100, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await assert.rejects(normalizeScreenshot(large));
  });
});
