'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createOperator(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const title = formData.get('title') as string;
  const email = formData.get('email') as string;
  const phoneNumber = formData.get('phoneNumber') as string;
  const discord = formData.get('discord') as string;
  const github = formData.get('github') as string;
  const notes = formData.get('notes') as string;

  if (!name) return { error: 'Name is required' };

  try {
    await prisma.operator.create({
      data: { name, title, email, phoneNumber, discord, github, notes },
    });
    revalidatePath('/operators');
    return { success: 'Operator created successfully.' };
  } catch (e) {
    return { error: 'Failed to create operator.' };
  }
}

export async function updateOperator(id: string, prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const title = formData.get('title') as string;
  const email = formData.get('email') as string;
  const phoneNumber = formData.get('phoneNumber') as string;
  const discord = formData.get('discord') as string;
  const github = formData.get('github') as string;
  const notes = formData.get('notes') as string;

  if (!name) return { error: 'Name is required' };

  try {
    await prisma.operator.update({
      where: { id },
      data: { name, title, email, phoneNumber, discord, github, notes },
    });
    revalidatePath('/operators');
    return { success: 'Operator updated successfully.' };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to update operator.' };
  }
}

export async function deleteOperator(id: string) {
  try {
    await prisma.operator.delete({ where: { id } });
    revalidatePath('/operators');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete operator.' };
  }
}
