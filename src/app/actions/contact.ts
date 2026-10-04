'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdminError, requireAdminAuth } from '@/lib/require-admin';
import { firstZodError, uuidSchema } from '@/lib/validation/common';
import { createContactSchema, updateContactSchema } from '@/lib/validation/contact';
import { finishDetailDelete, finishDetailUpdate, updateErrorCode } from '@/lib/detail-delete-form';
import { listReturnPath } from '@/lib/list-view-params';

export async function createContact(_prevState: unknown, formData: FormData) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const parsed = createContactSchema.safeParse({
    clientId: formData.get('clientId'),
    name: formData.get('name'),
    title: formData.get('title'),
    team: formData.get('team'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { clientId, name, title, team, email, phoneNumber, notes } = parsed.data;

  try {
    await prisma.contact.create({
      data: { clientId, name, title, team, email, phone: phoneNumber, notes },
    });
  } catch {
    return { error: 'Failed to create contact.' };
  }

  revalidatePath('/dashboard/contacts');
  redirect(listReturnPath(formData, '/dashboard/contacts'));
}

export async function updateContact(id: string, _prevState: unknown, formData: FormData) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const parsed = updateContactSchema.safeParse({
    clientId: formData.get('clientId'),
    name: formData.get('name'),
    title: formData.get('title'),
    team: formData.get('team'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { clientId, name, title, team, email, phoneNumber, notes } = parsed.data;

  try {
    await prisma.contact.update({
      where: { id: idParsed.data },
      data: { clientId, name, title, team, email, phone: phoneNumber, notes },
    });
    revalidatePath('/dashboard/contacts');
    return { success: 'Contact updated successfully.' };
  } catch {
    return { error: 'Failed to update contact.' };
  }
}

export async function updateContactFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await updateContact(id, {}, formData);
  finishDetailUpdate('/dashboard/contacts', formData, id, result, updateErrorCode(result.error));
}

export async function deleteContactFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await deleteContact(id);
  const code = result.error?.includes('Unauthorized') ? 'unauthorized' : 'generic';
  finishDetailDelete('/dashboard/contacts', formData, id, result, code);
}

export async function deleteContact(id: string) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  try {
    await prisma.contact.delete({ where: { id: idParsed.data } });
    revalidatePath('/dashboard/contacts');
    return { success: true };
  } catch {
    return { error: 'Failed to delete contact.' };
  }
}
