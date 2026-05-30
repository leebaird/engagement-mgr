'use server';

import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { getSession } from '@/lib/auth/session';
import { validatePasswordComplexity } from '@/lib/auth/password';
import { revalidatePath } from 'next/cache';

export async function createUser(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Unauthorized: Only admins can create users.' };
  }

  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'ADMIN' | 'USER';

  if (!username || !password || !role) {
    return { error: 'All fields are required.', fields: { username, role } };
  }

  const complexity = validatePasswordComplexity(password);
  if (!complexity.valid) {
    return { error: 'The password must be at last 16 character long, contain at least one uppercase letter, one number, and one symbol.', fields: { username, role } };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return { error: 'Username already exists.', fields: { username, role } };
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
    });

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
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Unauthorized: Only admins can update users.' };
  }

  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'ADMIN' | 'USER';

  if (!username || !role) {
    return { error: 'Username and Role are required.' };
  }

  try {
    const existing = await prisma.user.findFirst({ where: { username, NOT: { id } } });
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
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
      });
      data.passwordHash = passwordHash;
      data.lastPasswordChange = new Date(0); // Force password change on next login
    }

    await prisma.user.update({
      where: { id },
      data,
    });

    revalidatePath('/users');
    return { success: 'User updated successfully.' };
  } catch (err) {
    console.error(err);
    return { error: 'Failed to update user.' };
  }
}

export async function deleteUser(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Unauthorized' };
  }

  // Prevent users from deleting themselves
  if (session.userId === id) {
    return { error: 'You cannot delete yourself.' };
  }

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath('/users');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: 'Failed to delete user.' };
  }
}
