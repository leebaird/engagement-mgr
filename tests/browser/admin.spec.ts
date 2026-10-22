import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as argon2 from 'argon2';
import {
  actionFormFields,
  authenticate,
  createTestDatabase,
  type TestUser,
} from './support';

const db = createTestDatabase();
// Every user this spec creates carries the run tag, so cleanup removes exactly these rows.
const runTag = `adm-${crypto.randomUUID().slice(0, 8)}`;
const adminPassword = 'Admin-browser-test-42!';
const userPassword = 'User-browser-test-42!x';
const newPassword = 'Rotated-browser-test-42!';
let admin: TestUser & { username: string };
let member: TestUser & { username: string };

async function createUser(
  name: string,
  role: 'Admin' | 'User',
  password: string,
  lastPasswordChange = new Date()
) {
  return (await db.user.create({
    data: {
      username: `${runTag}-${name}`,
      passwordHash: await argon2.hash(password),
      role,
      lastPasswordChange,
    },
  })) as TestUser & { username: string };
}

async function signIn(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function signedInPage(context: BrowserContext, user: TestUser) {
  await authenticate(db, context, user);
  return context.newPage();
}

test.describe.serial('admin-only enforcement and account security', () => {
  test.beforeAll(async () => {
    admin = await createUser('admin', 'Admin', adminPassword);
    member = await createUser('member', 'User', userPassword);
  });

  test.afterAll(async () => {
    await db.user.deleteMany({ where: { username: { startsWith: runTag } } });
    await db.engagement.deleteMany({ where: { codeName: { startsWith: runTag } } });
    await db.client.deleteMany({ where: { company: { startsWith: runTag } } });
    await db.$disconnect();
  });

  test('regular users cannot open admin pages or download backups', async ({ context }) => {
    const page = await signedInPage(context, member);
    await page.goto('/dashboard/users');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/dashboard/users?tab=database&db=reset');
    await expect(page).toHaveURL(/\/dashboard$/);

    const backup = await context.request.get('/api/db/backup?file=em-backup-2026-01-01-0000.zip');
    expect(backup.status()).toBe(401);
  });

  test('admin-only actions reject a regular user replaying an admin form', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const adminPage = await signedInPage(adminContext, admin);
    await authenticate(db, memberContext, member);
    const victim = await createUser('victim', 'User', userPassword);
    const settingBefore = await db.applicationSetting.findFirst();

    // 409 means Next.js refused the action ID before the action ran, which would make a
    // rejection below pass without exercising the action's own admin check.
    const replayAs = async (context: BrowserContext, path: string, fields: Record<string, string>) => {
      const response = await context.request.post(path, { multipart: fields });
      expect(response.status()).toBeLessThan(400);
    };

    const createUserForm = () =>
      actionFormFields(adminPage, '/dashboard/users?create=1', '#create-user-form');

    // Control: the same replay works for an admin, so the rejections below are meaningful.
    await replayAs(adminContext, '/dashboard/users?create=1', {
      ...(await createUserForm()),
      username: `${runTag}-control`,
      password: userPassword,
      role: 'User',
    });
    expect(await db.user.count({ where: { username: `${runTag}-control` } })).toBe(1);

    // The Next.js dev server refuses this action ID for a non-admin request (409) before
    // createUser runs; other builds may run it and get rejected by requireAdminAuth instead.
    // Either way no user may appear. The edit replay below always reaches that same guard.
    const escalation = await memberContext.request.post('/dashboard/users?create=1', {
      multipart: {
        ...(await createUserForm()),
        username: `${runTag}-escalated`,
        password: userPassword,
        role: 'Admin',
      },
    });
    expect(escalation.status() === 409 || escalation.status() < 400).toBe(true);
    expect(await db.user.count({ where: { username: `${runTag}-escalated` } })).toBe(0);

    const deletePath = `/dashboard/users?detail=${victim.id}&delete=1`;
    await replayAs(
      memberContext,
      deletePath,
      await actionFormFields(adminPage, deletePath, '#delete-user-form')
    );
    expect(await db.user.count({ where: { id: victim.id } })).toBe(1);

    const editPath = `/dashboard/users?detail=${member.id}&edit=1`;
    await replayAs(memberContext, editPath, {
      ...(await actionFormFields(adminPage, editPath, '#edit-user-form')),
      username: member.username,
      role: 'Admin',
      password: '',
    });
    expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).role).toBe('User');

    const appearancePath = '/dashboard/users?tab=appearance';
    const currentColor = settingBefore?.highlightColor ?? 'Pink';
    await replayAs(memberContext, appearancePath, {
      ...(await actionFormFields(adminPage, appearancePath, 'form.appearance-settings-form')),
      highlightColor: currentColor === 'Blue' ? 'Green' : 'Blue',
    });
    expect((await db.applicationSetting.findFirst())?.highlightColor).toBe(
      settingBefore?.highlightColor
    );

    const engagementPath = '/dashboard/engagements?create=1';
    await replayAs(memberContext, engagementPath, {
      ...(await actionFormFields(adminPage, engagementPath, '#create-engagement-form')),
      codeName: `${runTag} escalated engagement`,
      clientName: `${runTag} client`,
      clientId: '',
    });
    expect(await db.engagement.count({ where: { codeName: { startsWith: runTag } } })).toBe(0);
    expect(await db.client.count({ where: { company: { startsWith: runTag } } })).toBe(0);

    // A wiped database would also remove the fixture users checked below.
    const resetPath = '/dashboard/users?tab=database&db=reset';
    await replayAs(memberContext, resetPath, {
      ...(await actionFormFields(adminPage, resetPath, '#reset-database-form')),
      confirm: 'RESET',
      password: adminPassword,
    });
    expect(await db.user.count({ where: { id: { in: [admin.id, member.id, victim.id] } } })).toBe(3);

    await adminContext.close();
    await memberContext.close();
  });

  test('a password set by an admin must be changed before using the dashboard', async ({
    page,
    browser,
  }) => {
    const invited = await createUser('invited', 'User', userPassword, new Date(0));
    await signIn(page, invited.username, userPassword);
    await expect(page).toHaveURL(/\/change-password$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/change-password$/);

    const oldCookies = await page.context().cookies();

    await page.getByLabel('Current Password').fill('Not-the-password-42!');
    await page.getByLabel('New Password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm New Password').fill(newPassword);
    await page.getByRole('button', { name: 'Set New Password' }).click();
    await expect(page.getByText('Current password is incorrect.')).toBeVisible();

    await page.getByLabel('Current Password').fill(userPassword);
    await page.getByLabel('New Password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm New Password').fill(newPassword);
    await page.getByRole('button', { name: 'Set New Password' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const stored = await db.user.findUniqueOrThrow({ where: { id: invited.id } });
    expect(await argon2.verify(stored.passwordHash, newPassword)).toBe(true);
    expect(stored.lastPasswordChange.getTime()).toBeGreaterThan(Date.now() - 60_000);

    // The pre-change session cookie is revoked: every page sends it back to login.
    const replay = await browser.newContext();
    await replay.addCookies(oldCookies);
    const replayPage = await replay.newPage();
    await replayPage.goto('/dashboard');
    await expect(replayPage).toHaveURL(/\/login$/);
    await replayPage.goto('/change-password');
    await expect(replayPage).toHaveURL(/\/login$/);
    await replay.close();
  });

  test('a password older than 90 days must be rotated at sign-in', async ({ page }) => {
    const stale = await createUser(
      'stale',
      'User',
      userPassword,
      new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
    );
    await signIn(page, stale.username, userPassword);
    await expect(page).toHaveURL(/\/change-password$/);
    await page.goto('/dashboard/findings');
    await expect(page).toHaveURL(/\/change-password$/);
  });

  test('admins manage users without deleting themselves or the last admin', async ({
    context,
    browser,
  }) => {
    const page = await signedInPage(context, admin);

    await page.goto('/dashboard/users?create=1');
    const createForm = page.locator('#create-user-form');
    await createForm.locator('input[name=username]').fill(`${runTag}-created`);
    await createForm.locator('input[name=password]').fill(userPassword);
    await createForm.locator('select[name=role]').selectOption('User');
    await page.locator('button[form="create-user-form"]').click();
    await expect(page).not.toHaveURL(/create=1/);
    const created = await db.user.findUniqueOrThrow({ where: { username: `${runTag}-created` } });
    expect(created.role).toBe('User');
    expect(created.lastPasswordChange.getTime()).toBe(0);

    // An admin password reset revokes the user's existing sessions.
    const activeUser = (await db.user.update({
      where: { id: created.id },
      data: { lastPasswordChange: new Date() },
    })) as TestUser;
    const createdContext = await browser.newContext();
    const createdPage = await signedInPage(createdContext, activeUser);
    await createdPage.goto('/dashboard');
    await expect(createdPage).toHaveURL(/\/dashboard$/);

    await page.goto(`/dashboard/users?detail=${created.id}&edit=1`);
    // The edit form resets its fields once hydrated; type only after its scripts have loaded.
    await page.waitForLoadState('networkidle');
    const resetField = page.locator('#edit-user-form input[name=password]');
    await resetField.fill(newPassword);
    await expect(resetField).toHaveValue(newPassword);
    await page.locator('button[form="edit-user-form"]').click();
    await expect(page.getByText('Edit User')).toHaveCount(0);
    await expect.poll(() => db.session.count({ where: { userId: created.id } })).toBe(0);
    await createdPage.goto('/dashboard');
    await expect(createdPage).toHaveURL(/\/login$/);
    await createdContext.close();

    const selfDeletePath = `/dashboard/users?detail=${admin.id}&delete=1`;
    const selfDelete = await context.request.post(selfDeletePath, {
      multipart: await actionFormFields(page, selfDeletePath, '#delete-user-form'),
    });
    expect(selfDelete.status()).toBeLessThan(400);
    expect(await db.user.count({ where: { id: admin.id } })).toBe(1);

    const otherAdmins = await db.user.count({ where: { role: 'Admin', NOT: { id: admin.id } } });
    test.skip(otherAdmins > 0, 'Last-admin protection needs the run admin to be the only admin.');
    const editSelfPath = `/dashboard/users?detail=${admin.id}&edit=1`;
    const selfDemote = await context.request.post(editSelfPath, {
      multipart: {
        ...(await actionFormFields(page, editSelfPath, '#edit-user-form')),
        username: admin.username,
        role: 'User',
        password: '',
      },
    });
    expect(selfDemote.status()).toBeLessThan(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: admin.id } })).role).toBe('Admin');
  });
});
