import { expect, type BrowserContext, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { SignJWT } from 'jose';
import { join } from 'node:path';
import { BROWSER_TEST_UPLOADS_DIR } from './uploads-dir';

export const browserTestUploadsPath = join(process.cwd(), BROWSER_TEST_UPLOADS_DIR);

/** Each spec owns its client so one spec's $disconnect cannot affect another. */
export function createTestDatabase(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.REPORTING_TEST_DATABASE_URL! }),
  });
}

const secret = new TextEncoder().encode(
  'isolated-browser-test-secret-at-least-32-characters'
);

export type TestUser = {
  id: string;
  role: 'Admin' | 'User';
  lastPasswordChange: Date;
};

/** Sign the user in by minting a server-side session and its cookie directly. */
export async function authenticate(
  db: PrismaClient,
  context: BrowserContext,
  user: TestUser
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

/** Read the Server Action fields of the form containing `button`, as rendered for `page`'s user. */
export async function actionFields(page: Page, path: string, button: string) {
  return readActionForm(page, path, { button });
}

/** Like actionFields, for forms whose submit button sits outside the form (`form=` attribute). */
export async function actionFormFields(page: Page, path: string, selector: string) {
  return readActionForm(page, path, { selector });
}

async function readActionForm(
  page: Page,
  path: string,
  target: { button?: string; selector?: string }
) {
  const response = await page.request.get(path);
  expect(response.status()).toBe(200);
  const fields = await page.evaluate(
    ({ html, button, selector }) => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      const form = selector
        ? document.querySelector<HTMLFormElement>(selector)
        : Array.from(document.forms).find((form) =>
            Array.from(form.querySelectorAll('button')).some(
              (element) => element.textContent?.trim() === button
            )
          );
      if (!form) throw new Error('Action form not found');
      return Object.fromEntries(new FormData(form)) as Record<string, string>;
    },
    { html: await response.text(), ...target }
  );
  expect(Object.keys(fields).some((key) => key.startsWith('$ACTION_'))).toBe(
    true
  );
  return fields;
}
