'use server';

import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { getSession } from '@/lib/auth/session';
import { validatePasswordComplexity, ARGON2_OPTIONS } from '@/lib/auth/password';
import { firstZodError, userIdSchema } from '@/lib/validation/common';
import { createUserSchema, updateUserSchema } from '@/lib/validation/user';
import { revalidatePath } from 'next/cache';
import { finishDetailDelete, finishDetailUpdate, updateErrorCode } from '@/lib/detail-delete-form';

async function wouldRemoveLastAdmin(userId: string, newRole: 'Admin' | 'User'): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== 'Admin' || newRole === 'Admin') {
    return false;
  }
  const adminCount = await prisma.user.count({ where: { role: 'Admin' } });
  return adminCount <= 1;
}

export async function createUser(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return { error: 'Unauthorized: Only admins can create users.' };
  }

  const parsed = createUserSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return {
      error: firstZodError(parsed.error),
      fields: {
        username: String(formData.get('username') ?? ''),
        role: String(formData.get('role') ?? ''),
      },
    };
  }

  const { username, password, role } = parsed.data;

  const complexity = validatePasswordComplexity(password);
  if (!complexity.valid) {
    return { error: 'The password must be at last 16 character long, contain at least one uppercase letter, one number, and one symbol.', fields: { username, role } };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return { error: 'Username already exists.', fields: { username, role } };
    }

    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

    await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        lastPasswordChange: new Date(0), // Force password change on first login
      },
    });

    revalidatePath('/users');
    return { success: 'User created successfully.' };
  } catch (err) {
    return { error: 'Failed to create user.', fields: { username, role } };
  }
}

export async function updateUser(id: string, prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return { error: 'Unauthorized: Only admins can update users.' };
  }

  const idParsed = userIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const parsed = updateUserSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { username, password, role } = parsed.data;

  if (await wouldRemoveLastAdmin(idParsed.data, role)) {
    return { error: 'Cannot remove the last admin account.' };
  }

  try {
    const existing = await prisma.user.findFirst({ where: { username, NOT: { id: idParsed.data } } });
    if (existing) {
      return { error: 'Username already exists.' };
    }

    const data: any = {
      username,
      role,
    };

    if (password) {
      const complexity = validatePasswordComplexity(password);
      if (!complexity.valid) {
        return { error: 'The password must be at last 16 character long, contain at least one uppercase letter, one number, and one symbol.' };
      }
      const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
      data.passwordHash = passwordHash;
      data.lastPasswordChange = new Date(0); // Force password change on next login
    }

    await prisma.user.update({
      where: { id: idParsed.data },
      data,
    });

    revalidatePath('/users');
    return { success: 'User updated successfully.' };
  } catch (err) {
    console.error(err);
    return { error: 'Failed to update user.' };
  }
}

export async function updateUserFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await updateUser(id, {}, formData);
  finishDetailUpdate('/users', formData, id, result, updateErrorCode(result.error));
}

export async function deleteUserFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await deleteUser(id);
  let code = 'generic';
  if (result.error?.includes('last admin')) code = 'last-admin';
  else if (result.error?.includes('yourself')) code = 'self';
  else if (result.error?.includes('Unauthorized')) code = 'unauthorized';
  finishDetailDelete('/users', formData, id, result, code);
}

export async function deleteUser(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return { error: 'Unauthorized' };
  }

  const idParsed = userIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const userId = idParsed.data;

  // Prevent users from deleting themselves
  if (session.userId === userId) {
    return { error: 'You cannot delete yourself.' };
  }

  if (await wouldRemoveLastAdmin(userId, 'User')) {
    return { error: 'Cannot delete the last admin account.' };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/users');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: 'Failed to delete user.' };
  }
}
