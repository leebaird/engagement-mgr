'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAuth, isAuthError } from '@/lib/require-auth';
import {
  contentFields,
  findingContentSchema,
  versionSchema,
} from '@/lib/reporting';
import { logAuditEvent } from '@/lib/audit-log';

export async function saveTemplate(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  let id = '';
  try {
    const content = findingContentSchema.parse({
      ...Object.fromEntries(contentFields.map((k) => [k, form.get(k) ?? ''])),
      observation: '',
      affectedHosts: '',
    });
    const approved = actor.role === 'Admin' && form.get('approved') === 'on';
    const data = {
      title: content.title,
      category: content.category,
      severity: content.severity,
      content,
      approved,
    };
    if (form.get('id')) {
      id = z.uuid().parse(form.get('id'));
      const version = versionSchema.parse(form.get('version'));
      // Curated library maintenance is administrative; all users may propose new templates.
      if (actor.role !== 'Admin')
        redirect('/dashboard/templates?error=permission');
      const result = await prisma.findingTemplate.updateMany({
        where: { id, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new Error('Conflict');
    } else {
      const result = await prisma.findingTemplate.create({ data });
      id = result.id;
    }
  } catch {
    redirect('/dashboard/templates?error=save');
  }
  await logAuditEvent('template.save', actor.userId, 'success');
  revalidatePath('/dashboard/templates');
  redirect(
    actor.role === 'Admin'
      ? `/dashboard/templates?detail=${id}`
      : '/dashboard/templates?proposed=1'
  );
}

export async function useTemplate(form: FormData): Promise<void> {
  const actor = await requireAuth();
  if (isAuthError(actor)) redirect('/login');
  let id = '';
  try {
    const templateId = z.uuid().parse(form.get('templateId'));
    const engagementId = z.uuid().parse(form.get('engagementId'));
    const finding = await prisma.$transaction(async (tx) => {
      const template = await tx.findingTemplate.findFirstOrThrow({
        where: { id: templateId, approved: true },
      });
      const {
        observation: _observation,
        affectedHosts: _hosts,
        supportingLinks,
        ...content
      } = findingContentSchema.parse(template.content);
      return tx.finding.create({
        data: {
          ...content,
          supportingData: supportingLinks,
          engagementId,
          authorId: actor.userId,
          templateId,
          engagementContext: { create: { engagementId } },
        },
      });
    });
    id = finding.id;
  } catch {
    redirect('/dashboard/templates?error=use');
  }
  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/findings/${id}/write`);
}
