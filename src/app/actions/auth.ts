'use server';

import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { createSession, deleteSession, getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import {
  ARGON2_OPTIONS,
  validatePasswordComplexity,
} from '@/lib/auth/password';
import { verifyUserPasswordRateLimited } from '@/lib/auth/verify-password';
import { changePasswordSchema } from '@/lib/validation/auth';
import { firstZodError } from '@/lib/validation/common';

export async function logout() {
  await deleteSession();
  redirect('/login');
}

export async function changePassword(_prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'You must be logged in to change your password.' };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      error: firstZodError(parsed.error),
    };
  }

  const { currentPassword, password: newPassword } = parsed.data;

  const complexity = validatePasswordComplexity(newPassword);
  if (!complexity.valid) {
    return {
      error: 'The password must be at least 16 characters long, contain at least one uppercase letter, one number, and one symbol.',
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!user) {
      return { error: 'You must be logged in to change your password.' };
    }

    const currentPasswordResult = await verifyUserPasswordRateLimited(
      session.userId,
      currentPassword
    );

    if (!currentPasswordResult.ok) {
      if (currentPasswordResult.limited) {
        return {
          error: `Too many attempts. Try again in ${currentPasswordResult.retryAfterMinutes} minute(s).`,
        };
      }
      return {
        error: 'Current password is incorrect.',
      };
    }

    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
    const passwordChangedAt = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: {
          passwordHash,
          lastPasswordChange: passwordChangedAt,
        },
      }),
      prisma.session.deleteMany({
        where: { userId: session.userId },
      }),
    ]);

    // Refresh the session with the new lastPasswordChange timestamp
    await createSession({
      userId: session.userId,
      role: user.role,
      lastPasswordChange: passwordChangedAt.toISOString(),
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
    };
  }

  redirect('/dashboard');
}
