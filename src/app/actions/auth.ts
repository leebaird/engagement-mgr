'use server';

import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { createSession, deleteSession, getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import {
  clearLoginRateLimit,
  isLoginRateLimited,
  loginRateLimitKey,
  recordLoginFailure,
} from '@/lib/auth/login-rate-limit';
import { validatePasswordComplexity, ARGON2_OPTIONS } from '@/lib/auth/password';
import { getClientIp } from '@/lib/request-client-ip';
import { changePasswordSchema, loginSchema } from '@/lib/validation/auth';
import { firstZodError } from '@/lib/validation/common';

export async function login(_prevState: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { username, password } = parsed.data;
  const rateLimitKey = loginRateLimitKey(await getClientIp(), username);
  const rateLimit = await isLoginRateLimited(rateLimitKey);

  if (rateLimit.limited) {
    return {
      error: `Too many login attempts. Try again in ${rateLimit.retryAfterMinutes} minute(s).`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    await recordLoginFailure(rateLimitKey);
    return { error: 'Invalid credentials' };
  }

  let needsPasswordChange = false;

  try {
    const isPasswordValid = await argon2.verify(user.passwordHash, password, ARGON2_OPTIONS);

    if (!isPasswordValid) {
      await recordLoginFailure(rateLimitKey);
      return { error: 'Invalid credentials' };
    }

    await clearLoginRateLimit(rateLimitKey);

    // Record the login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const lastPasswordChange = user.lastPasswordChange;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    needsPasswordChange = lastPasswordChange < ninetyDaysAgo;

    await createSession({
      userId: user.id,
      role: user.role,
      lastPasswordChange: lastPasswordChange.toISOString(),
    });

  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An error occurred during login' };
  }

  if (needsPasswordChange) {
    redirect('/change-password');
  }

  redirect('/');
}

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
      select: { passwordHash: true, role: true },
    });

    if (!user) {
      return { error: 'You must be logged in to change your password.' };
    }

    const currentPasswordValid = await argon2.verify(
      user.passwordHash,
      currentPassword,
      ARGON2_OPTIONS
    );

    if (!currentPasswordValid) {
      return {
        error: 'Current password is incorrect.',
      };
    }

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
      role: user.role,
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
    };
  }

  redirect('/');
}
