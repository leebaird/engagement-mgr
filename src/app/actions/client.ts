'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { isAdminError, requireAdminAuth } from '@/lib/require-admin';
import { createClientSchema, updateClientDataSchema } from '@/lib/validation/client';
import { firstZodError, uuidSchema } from '@/lib/validation/common';
import { finishDetailDelete, finishDetailUpdate, updateErrorCode } from '@/lib/detail-delete-form';

export async function createClient(_prevState: unknown, formData: FormData) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const parsed = createClientSchema.safeParse({
    companyName: formData.get('companyName'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    zip: formData.get('zip'),
    phoneNumber: formData.get('phoneNumber'),
    website: formData.get('website'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { companyName, address, city, state, zip, phoneNumber, website, notes } = parsed.data;

  try {
    await prisma.client.create({
      data: {
        company: companyName,
        address,
        city,
        state,
        zip,
        phone: phoneNumber,
        website,
        notes,
      },
    });
    revalidatePath('/clients');
    return { success: 'Client created successfully.' };
  } catch {
    return { error: 'Failed to create client.' };
  }
}

export async function updateClient(id: string, data: {
  company?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  website?: string | null;
  phone?: string | null;
  notes?: string | null;
}) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const parsed = updateClientDataSchema.safeParse(data);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  try {
    await prisma.client.update({
      where: { id: idParsed.data },
      data: {
        company: parsed.data.company,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        zip: parsed.data.zip,
        website: parsed.data.website,
        phone: parsed.data.phone,
        notes: parsed.data.notes,
      },
    });
    revalidatePath('/clients');
    return { success: true };
  } catch {
    return { error: 'Failed to update client.' };
  }
}

export async function updateClientFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await updateClient(id, {
    company: formData.get('company')?.toString() ?? '',
    address: formData.get('address')?.toString() || null,
    city: formData.get('city')?.toString() || null,
    state: formData.get('state')?.toString() || null,
    zip: formData.get('zip')?.toString() || null,
    website: formData.get('website')?.toString() || null,
    phone: formData.get('phone')?.toString() || null,
    notes: formData.get('notes')?.toString() || null,
  });
  finishDetailUpdate('/clients', formData, id, result, updateErrorCode(result.error));
}

export async function deleteClientFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await deleteClient(id);
  const code = result.error?.includes('Unauthorized') ? 'unauthorized' : 'generic';
  finishDetailDelete('/clients', formData, id, result, code);
}

export async function deleteClient(id: string) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  try {
    await prisma.client.delete({ where: { id: idParsed.data } });
    revalidatePath('/clients');
    return { success: true };
  } catch {
    return { error: 'Failed to delete client.' };
  }
}
