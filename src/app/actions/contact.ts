'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { isAuthError, requireAuth } from '@/lib/require-auth';
import { firstZodError, uuidSchema } from '@/lib/validation/common';
import { createContactSchema, updateContactSchema } from '@/lib/validation/contact';

export async function createContact(prevState: any, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const parsed = createContactSchema.safeParse({
    clientId: formData.get('clientId'),
    name: formData.get('name'),
    title: formData.get('title'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { clientId, name, title, email, phoneNumber, notes } = parsed.data;

  try {
    await prisma.contact.create({
      data: { clientId, name, title, email, phone: phoneNumber, notes },
    });
    revalidatePath('/contacts');
    return { success: 'Contact created successfully.' };
  } catch (e) {
    return { error: 'Failed to create contact.' };
  }
}

export async function updateContact(id: string, prevState: any, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const parsed = updateContactSchema.safeParse({
    clientId: formData.get('clientId'),
    name: formData.get('name'),
    title: formData.get('title'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { clientId, name, title, email, phoneNumber, notes } = parsed.data;

  try {
    await prisma.contact.update({
      where: { id: idParsed.data },
      data: { clientId, name, title, email, phone: phoneNumber, notes },
    });
    revalidatePath('/contacts');
    return { success: 'Contact updated successfully.' };
  } catch (e) {
    return { error: 'Failed to update contact.' };
  }
}

export async function deleteContact(id: string) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  try {
    await prisma.contact.delete({ where: { id: idParsed.data } });
    revalidatePath('/contacts');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete contact.' };
  }
}