'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { isAuthError, requireAuth } from '@/lib/require-auth';

export async function createContact(prevState: any, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };
  const clientId = formData.get('clientId') as string;
  const name = formData.get('name') as string;
  const title = formData.get('title') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phoneNumber') as string;
  const notes = formData.get('notes') as string;

  if (!clientId || !name) return { error: 'Client and Name are required' };

  try {
    await prisma.contact.create({
      data: { clientId, name, title, email, phone, notes },
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

  const clientId = formData.get('clientId') as string;
  const name = formData.get('name') as string;
  const title = formData.get('title') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phoneNumber') as string;
  const notes = formData.get('notes') as string;

  if (!clientId || !name) return { error: 'Client and Name are required' };

  try {
    await prisma.contact.update({
      where: { id },
      data: { clientId, name, title, email, phone, notes },
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

  try {
    await prisma.contact.delete({ where: { id } });
    revalidatePath('/contacts');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete contact.' };
  }
}
