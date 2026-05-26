'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createClient(prevState: any, formData: FormData) {
  const company = formData.get('companyName') as string;
  const address = formData.get('address') as string;
  const city = formData.get('city') as string;
  const state = (formData.get('state') as string)?.toUpperCase();
  const zip = formData.get('zip') as string;
  const phone = formData.get('phoneNumber') as string;
  const website = formData.get('website') as string;
  const notes = formData.get('notes') as string;

  if (!company) return { error: 'Company Name is required' };

  try {
    await prisma.client.create({
      data: { company, address, city, state, zip, phone, website, notes },
    });
    revalidatePath('/clients');
    return { success: 'Client created successfully.' };
  } catch (e) {
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
  try {
    await prisma.client.update({
      where: { id },
      data: {
        company: data.company,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        website: data.website,
        phone: data.phone,
        notes: data.notes,
      },
    });
    revalidatePath('/clients');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to update client.' };
  }
}

export async function deleteClient(id: string) {
  try {
    await prisma.client.delete({ where: { id } });
    revalidatePath('/clients');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete client.' };
  }
}
