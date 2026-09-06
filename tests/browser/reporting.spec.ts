import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { SignJWT } from 'jose';
import * as argon2 from 'argon2';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.env.REPORTING_TEST_DATABASE_URL!;
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const secret = new TextEncoder().encode(
  'isolated-browser-test-secret-at-least-32-characters'
);
const loginPassword = 'Browser-login-test-42!';
let author: { id: string; username: string; role: 'User'; lastPasswordChange: Date },
  admin: { id: string; username: string; role: 'Admin'; lastPasswordChange: Date };
let engagementId: string,
  clientId: string,
  findingId: string,
  templateId: string;

async function authenticate(
  context: BrowserContext,
  user: typeof author | typeof admin
) {
  const session = await db.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const token = await new SignJWT({
    sessionId: session.id,
    userId: user.id,
    role: user.role,
    lastPasswordChange: user.lastPasswordChange.toISOString(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);
  await context.addCookies([
    {
      name: 'session',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function actionFields(page: Page, path: string, button: string) {
  const response = await page.request.get(path);
  expect(response.status()).toBe(200);
  const fields = await page.evaluate(
    ({ html, button }) => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      const form = Array.from(document.forms).find((form) =>
        Array.from(form.querySelectorAll('button')).some(
          (element) => element.textContent?.trim() === button
        )
      );
      if (!form) throw new Error('Action form not found');
      return Object.fromEntries(new FormData(form)) as Record<string, string>;
    },
    { html: await response.text(), button }
  );
  expect(Object.keys(fields).some((key) => key.startsWith('$ACTION_'))).toBe(
    true
  );
  return fields;
}

test.describe.serial('authoring and reporting', () => {
  test.beforeAll(async () => {
    author = (await db.user.create({
      data: {
        username: `author-${crypto.randomUUID()}`,
        passwordHash: 'unused-test-only',
        role: 'User',
      },
    })) as typeof author;
    admin = (await db.user.create({
      data: {
        username: `reviewer-${crypto.randomUUID()}`,
        passwordHash: await argon2.hash(loginPassword),
        role: 'Admin',
      },
    })) as typeof admin;
    const client = await db.client.create({
      data: { company: 'Browser test client' },
    });
    clientId = client.id;
    const engagement = await db.engagement.create({
      data: {
        clientId,
        codeName: `Browser fixture ${crypto.randomUUID()}`,
        targets: 'example.test',
        exclusions: 'Other systems',
      },
    });
    engagementId = engagement.id;
    const finding = await db.finding.create({
      data: {
        engagementId,
        title: 'Browser finding',
        severity: 'High',
        background: 'Background',
        remediation: 'Apply fix',
        authorId: author.id,
        reviewerId: admin.id,
        engagementContext: {
          create: {
            engagementId,
            observation: 'Reproduction steps',
            affectedHosts: 'example.test',
          },
        },
      },
    });
    findingId = finding.id;
  });
  test.afterAll(async () => {
    if (engagementId) {
      const findings = await db.finding.findMany({
        where: { engagementId },
        select: { id: true },
      });
      const screenshots = await db.screenshot.findMany({
        where: { findingId: { in: findings.map((f) => f.id) } },
      });
      await db.screenshot.deleteMany({
        where: { id: { in: screenshots.map((s) => s.id) } },
      });
      await db.finding.deleteMany({ where: { engagementId } });
      await db.engagement.deleteMany({ where: { id: engagementId } });
      for (const screenshot of screenshots)
        await unlink(join(process.cwd(), 'uploads', screenshot.filePath)).catch(
          () => {}
        );
    }
    if (templateId)
      await db.findingTemplate.deleteMany({ where: { id: templateId } });
    if (clientId) await db.client.deleteMany({ where: { id: clientId } });
    if (author && admin)
      await db.user.deleteMany({
        where: { id: { in: [author.id, admin.id] } },
      });
    await db.$disconnect();
  });
  test('unauthenticated users cannot open confidential screens or PDFs', async ({
    page,
    request,
  }) => {
    await page.goto(`/dashboard/findings/${findingId}/write`);
    await expect(page).toHaveURL(/\/login/);
    const response = await request.get(
      `/api/reports/${engagementId}?preview=1`,
      { maxRedirects: 0 }
    );
    expect([307, 401]).toContain(response.status());
    expect(response.headers()['content-type']).not.toContain('application/pdf');
  });
  test('login succeeds and logout revokes a copied session token', async ({
    page,
    context,
    browser,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(admin.username);
    await page.getByLabel('Password').fill(loginPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const copiedSession = (await context.cookies()).find(
      (cookie) => cookie.name === 'session'
    );
    expect(copiedSession).toBeDefined();

    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    const replayContext = await browser.newContext({
      baseURL: 'http://127.0.0.1:3317',
    });
    await replayContext.addCookies([copiedSession!]);
    const replayPage = await replayContext.newPage();
    await replayPage.goto('/dashboard');
    await expect(replayPage).toHaveURL(/\/login$/);
    await replayContext.close();
  });
  test('drafts, concurrent edits, evidence, independent review and immutable PDF issuance', async ({
    page,
    context,
    browser,
  }, testInfo) => {
    await authenticate(context, author);
    const writingUrl = `/dashboard/findings/${findingId}/write`;
    await page.goto(writingUrl);
    await page.getByRole('button', { name: 'Show preview' }).click();
    await expect(
      page.getByRole('button', { name: 'Hide preview' })
    ).toBeVisible();
    await page
      .locator('textarea[name=observation]')
      .fill('1. Send request\n2. Observe **the result**');
    await expect(page.locator('textarea[name=observation]')).toHaveValue(
      '1. Send request\n2. Observe **the result**'
    );
    await page.getByRole('button', { name: 'Save private draft' }).click();
    await expect(page.getByRole('status')).toContainText('Private draft saved');
    const reviewerContext = await browser.newContext({
      baseURL: 'http://127.0.0.1:3317',
    });
    await authenticate(reviewerContext, admin);
    const reviewer = await reviewerContext.newPage();
    await reviewer.goto(writingUrl);
    await expect(
      reviewer.getByText('A private draft is available')
    ).toHaveCount(0);
    const otherTab = await context.newPage();
    await otherTab.goto(writingUrl);
    await page
      .getByRole('button', { name: 'Save finding', exact: true })
      .click();
    await expect(page).toHaveURL(/saved=\d+/);
    await otherTab.locator('input[name=title]').fill('Stale overwrite attempt');
    await otherTab
      .getByRole('button', { name: 'Save finding', exact: true })
      .click();
    await expect(
      otherTab.locator('.writing-form').getByRole('alert')
    ).toContainText('This finding changed');
    await expect(otherTab.locator('input[name=title]')).toHaveValue(
      'Stale overwrite attempt'
    );
    expect(
      (await db.finding.findUniqueOrThrow({ where: { id: findingId } })).title
    ).toBe('Browser finding');
    await otherTab.close();
    // Generate a well-formed fixture with the same image decoder used in production.
    const sharp = (await import('sharp')).default;
    const evidence = await sharp({
      create: { width: 16, height: 16, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await page
      .locator('textarea[name=background]')
      .fill('Writing continues during evidence upload');
    await page.locator('input[name=screenshot]').setInputFiles([
      { name: 'proof.png', mimeType: 'image/png', buffer: evidence },
      { name: 'proof2.png', mimeType: 'image/png', buffer: evidence },
    ]);
    await page.locator('input[name=description]').fill('Proof of result');
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.getByText('Screenshot uploaded.')).toBeVisible();
    await expect(page.locator('.evidence-card')).toHaveCount(2);
    await expect(page.locator('textarea[name=background]')).toHaveValue(
      'Writing continues during evidence upload'
    );
    await page.getByRole('button', { name: 'Save private draft' }).click();
    await expect(
      page.locator('.writing-form').getByRole('status')
    ).toContainText('Private draft saved');
    await page
      .getByRole('button', { name: 'Save finding', exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await db.finding.findUniqueOrThrow({ where: { id: findingId } }))
            .background
      )
      .toBe('Writing continues during evidence upload');
    await expect(page).toHaveURL(/saved=4/);
    await expect(page.getByText(/Revision 4 · Draft/)).toBeVisible();
    await page.getByRole('button', { name: 'Send for review' }).click();
    await expect(page.getByText(/Revision .* · Ready/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Approve revision' })
    ).toHaveCount(0);
    await reviewer.reload();
    const reviewFields = await actionFields(
      reviewer,
      writingUrl,
      'Approve revision'
    );
    reviewFields.status = 'Approved';
    await context.request.post(writingUrl, { multipart: reviewFields });
    expect(
      (await db.finding.findUniqueOrThrow({ where: { id: findingId } }))
        .reviewStatus
    ).toBe('Ready');
    await reviewer.getByRole('button', { name: 'Approve revision' }).click();
    await expect(reviewer.getByText(/Revision .* · Approved/)).toBeVisible();
    await reviewer.screenshot({
      path: testInfo.outputPath('writing.png'),
      fullPage: true,
    });
    await reviewer.goto(`/dashboard/reports?engagement=${engagementId}`);
    await reviewer
      .locator('textarea[name=executiveSummary]')
      .fill('Executive summary for the test engagement.');
    await reviewer
      .getByRole('button', { name: 'Save report settings' })
      .click();
    await expect(reviewer.getByText('Report settings saved.')).toBeVisible();
    const preview = await reviewerContext.request.get(
      `/api/reports/${engagementId}?preview=1`
    );
    expect(preview.status()).toBe(200);
    expect(preview.headers()['cache-control']).toBe('private, no-store');
    expect((await preview.body()).subarray(0, 5).toString()).toBe('%PDF-');
    const fields = await actionFields(
      reviewer,
      `/dashboard/reports?engagement=${engagementId}`,
      'Issue approved PDF'
    );
    fields.confirm = 'on';
    await context.request.post('/dashboard/reports', { multipart: fields });
    expect(await db.issuedReport.count({ where: { engagementId } })).toBe(0);
    const crossOrigin = await reviewerContext.request.post(
      '/dashboard/reports',
      { multipart: fields, headers: { Origin: 'https://untrusted.example' } }
    );
    expect(crossOrigin.status()).toBeGreaterThanOrEqual(400);
    expect(await db.issuedReport.count({ where: { engagementId } })).toBe(0);
    await reviewer.locator('input[name=confirm]').check();
    await reviewer.getByRole('button', { name: 'Issue approved PDF' }).click();
    await expect(
      reviewer.getByText('The approved PDF has been issued')
    ).toBeVisible();
    const issued = await db.issuedReport.findFirstOrThrow({
      where: { engagementId },
    });
    const download = await reviewerContext.request.get(
      `/api/reports/${issued.id}`
    );
    expect(download.status()).toBe(200);
    expect(await download.body()).toEqual(Buffer.from(issued.pdf));
    await writeFile(testInfo.outputPath('issued.pdf'), await download.body());
    await db.issuedReport.update({
      where: { id: issued.id },
      data: { sha256: '00'.repeat(32) },
    });
    expect(
      (await reviewerContext.request.get(`/api/reports/${issued.id}`)).status()
    ).toBe(409);
    await db.issuedReport.update({
      where: { id: issued.id },
      data: { sha256: issued.sha256 },
    });
    await db.user.update({ where: { id: admin.id }, data: { role: 'User' } });
    await reviewerContext.request.post('/dashboard/reports', {
      multipart: fields,
    });
    expect(await db.issuedReport.count({ where: { engagementId } })).toBe(1);
    await db.user.update({ where: { id: admin.id }, data: { role: 'Admin' } });
    await page.goto(writingUrl);
    await page
      .locator('textarea[name=background]')
      .fill('Changed after issuance');
    await page
      .getByRole('button', { name: 'Save finding', exact: true })
      .click();
    await expect(page).toHaveURL(/saved=\d+/);
    expect(
      (await db.finding.findUniqueOrThrow({ where: { id: findingId } }))
        .reviewStatus
    ).toBe('Draft');
    expect(
      Buffer.from(
        (await db.issuedReport.findUniqueOrThrow({ where: { id: issued.id } }))
          .pdf
      )
    ).toEqual(await download.body());
    await reviewerContext.close();
  });
  test('approved templates and selective imports work through plain forms', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3317',
      javaScriptEnabled: false,
    });
    await authenticate(context, admin);
    const page = await context.newPage();
    await page.goto('/dashboard/templates?create=1');
    const title = `Reusable fixture ${crypto.randomUUID()}`;
    await page.locator('textarea[name=title]').fill(title);
    await page.locator('textarea[name=background]').fill('Reusable background');
    await page
      .locator('textarea[name=remediation]')
      .fill('Reusable remediation');
    await page
      .locator('.modal-panel select[name=severity]')
      .selectOption('High');
    await page.locator('input[name=approved]').check();
    await page.getByRole('button', { name: 'Save Template' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    templateId = (
      await db.findingTemplate.findFirstOrThrow({ where: { title } })
    ).id;
    await page.locator('select[name=engagementId]').selectOption(engagementId);
    await page
      .getByRole('button', { name: 'Create finding from template' })
      .click();
    await expect(page).toHaveURL(/\/write/);
    await expect(page.locator('textarea[name=observation]')).toHaveValue('');
    await expect(page.locator('textarea[name=affectedHosts]')).toHaveValue('');
    await context.close();
    const importContext = await browser.newContext({
      baseURL: 'http://127.0.0.1:3317',
    });
    await authenticate(importContext, author);
    const imports = await importContext.newPage();
    for (let attempt = 0; attempt < 2; attempt++) {
      await imports.goto(`/dashboard/imports?engagement=${engagementId}`);
      await imports.locator('select[name=format]').selectOption('Nuclei');
      const input = JSON.stringify({
        'template-id': 'browser-test',
        info: { name: 'Imported fixture', severity: 'high' },
        'matched-at': 'https://example.test',
      });
      await imports.locator('input[name=file]').setInputFiles({
        name: 'scan.jsonl',
        mimeType: 'application/json',
        buffer: Buffer.from(input),
      });
      await imports.getByRole('button', { name: 'Preview import' }).click();
      await expect(
        imports.getByRole('heading', { name: 'Preview 1 findings' })
      ).toBeVisible();
      await imports.locator('input[name=selected]').check();
      await imports
        .getByRole('button', { name: 'Import selected findings' })
        .click();
      await expect(imports.getByRole('status')).toContainText(
        `Imported ${attempt === 0 ? 1 : 0} new findings`
      );
    }
    expect(
      await db.finding.count({
        where: {
          engagementId,
          title: 'Imported fixture',
          reviewStatus: 'Draft',
        },
      })
    ).toBe(1);
    await importContext.close();
  });
});
