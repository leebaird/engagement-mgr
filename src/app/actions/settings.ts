'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buildPathQuery } from '@/lib/list-view-params';
import {
  APPLICATION_SETTING_ID,
  isHighlightColor,
} from '@/lib/highlight-color';
import { isAdminError, requireAdminAuth } from '@/lib/require-admin';

function appearanceHref(
  formData: FormData,
  result: { appearanceMsg?: string; appearanceError?: string },
) {
  return buildPathQuery(
    '/dashboard/users',
    {
      sort: formData.get('sort')?.toString(),
      dir: formData.get('dir')?.toString(),
    },
    { tab: 'appearance', ...result },
  );
}

export async function updateHighlightColor(formData: FormData): Promise<void> {
  const session = await requireAdminAuth();
  if (isAdminError(session)) {
    redirect('/dashboard');
  }

  const highlightColor = formData.get('highlightColor');
  if (!isHighlightColor(highlightColor)) {
    redirect(appearanceHref(formData, { appearanceError: 'invalid' }));
  }

  try {
    await prisma.applicationSetting.upsert({
      where: { id: APPLICATION_SETTING_ID },
      create: { id: APPLICATION_SETTING_ID, highlightColor },
      update: { highlightColor },
    });
  } catch {
    redirect(appearanceHref(formData, { appearanceError: 'save' }));
  }

  revalidatePath('/', 'layout');
  redirect(appearanceHref(formData, { appearanceMsg: 'saved' }));
}
