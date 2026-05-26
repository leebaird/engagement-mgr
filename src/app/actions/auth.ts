'use server';

import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { createSession, deleteSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export async function login(prevState: any, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { error: 'Invalid credentials' };
  }

  try {
    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      return { error: 'Invalid credentials' };
    }

    await createSession({
      userId: user.id,
      role: user.role,
      lastPasswordChange: user.lastPasswordChange.toISOString(),
    });

  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An error occurred during login' };
  }

  redirect('/');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
