'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { isAdminError, requireAdminAuth } from '@/lib/require-admin';
import { firstZodError, uuidSchema } from '@/lib/validation/common';
import { createOperatorSchema, updateOperatorSchema } from '@/lib/validation/operator';
import { finishDetailDelete, finishDetailUpdate, updateErrorCode } from '@/lib/detail-delete-form';

export async function createOperator(_prevState: unknown, formData: FormData) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const parsed = createOperatorSchema.safeParse({
    name: formData.get('name'),
    title: formData.get('title'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    discord: formData.get('discord'),
    github: formData.get('github'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { name, title, email, phoneNumber, discord, github, notes } = parsed.data;

  try {
    await prisma.operator.create({
      data: { name, title, email, phoneNumber, discord, github, notes },
    });
    revalidatePath('/dashboard/operators');
    return { success: 'Operator created successfully.' };
  } catch {
    return { error: 'Failed to create operator.' };
  }
}

export async function updateOperator(id: string, _prevState: unknown, formData: FormData) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const parsed = updateOperatorSchema.safeParse({
    name: formData.get('name'),
    title: formData.get('title'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    discord: formData.get('discord'),
    github: formData.get('github'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { name, title, email, phoneNumber, discord, github, notes } = parsed.data;

  try {
    await prisma.operator.update({
      where: { id: idParsed.data },
      data: { name, title, email, phoneNumber, discord, github, notes },
    });
    revalidatePath('/dashboard/operators');
    return { success: 'Operator updated successfully.' };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to update operator.' };
  }
}

export async function updateOperatorFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await updateOperator(id, {}, formData);
  finishDetailUpdate('/dashboard/operators', formData, id, result, updateErrorCode(result.error));
}

export async function deleteOperatorFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await deleteOperator(id);
  const code = result.error?.includes('Unauthorized') ? 'unauthorized' : 'generic';
  finishDetailDelete('/dashboard/operators', formData, id, result, code);
}

export async function deleteOperator(id: string) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  try {
    await prisma.operator.delete({ where: { id: idParsed.data } });
    revalidatePath('/dashboard/operators');
    return { success: true };
  } catch {
    return { error: 'Failed to delete operator.' };
  }
}
