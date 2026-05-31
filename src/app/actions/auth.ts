'use server';

import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { createSession, deleteSession, getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { validatePasswordComplexity, ARGON2_OPTIONS } from '@/lib/auth/password';

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
    const isPasswordValid = await argon2.verify(user.passwordHash, password, ARGON2_OPTIONS);

    if (!isPasswordValid) {
      return { error: 'Invalid credentials' };
    }

    // Record the login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const lastPasswordChange = user.lastPasswordChange;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const needsPasswordChange = lastPasswordChange < ninetyDaysAgo;

    await createSession({
      userId: user.id,
      role: user.role,
      lastPasswordChange: lastPasswordChange.toISOString(),
    });

    if (needsPasswordChange) {
      redirect('/change-password');
    }

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

export async function changePassword(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'You must be logged in to change your password.' };
  }

  const newPassword = (formData.get('password') as string || '').trim();
  const confirmPassword = (formData.get('confirmPassword') as string || '').trim();

  if (!newPassword || !confirmPassword) {
    return { 
      error: 'Both password fields are required.',
      fields: { password: newPassword, confirmPassword }
    };
  }

  if (newPassword !== confirmPassword) {
    return { 
      error: 'Passwords do not match.',
      fields: { password: newPassword, confirmPassword }
    };
  }

  const complexity = validatePasswordComplexity(newPassword);
  if (!complexity.valid) {
    return { 
      error: 'The password must be at least 16 characters long, contain at least one uppercase letter, one number, and one symbol.',
      fields: { password: newPassword, confirmPassword }
    };
  }

  try {
    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash,
        lastPasswordChange: new Date(),
      },
    });

    // Refresh the session with the new lastPasswordChange timestamp
    await createSession({
      userId: session.userId,
      role: session.role,
      lastPasswordChange: new Date().toISOString(),
    });

  } catch (error) {
    // Re-throw Next.js redirect errors so they actually work
    if (error && typeof error === 'object' && 'digest' in error && 
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Change password error:', error);
    return { 
      error: 'An error occurred while changing your password.',
      fields: { password: newPassword, confirmPassword }
    };
  }

  redirect('/');
}
