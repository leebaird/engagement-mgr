import { z } from 'zod';

import { MAX_PASSWORD_LENGTH } from '@/lib/auth/password';
import { usernameSchema } from '@/lib/validation/common';

const passwordInputSchema = z
  .string()
  .min(1, 'Password is required.')
  .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordInputSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: passwordInputSchema,
    password: z
      .string()
      .trim()
      .min(1, 'Both password fields are required.')
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`),
    confirmPassword: z
      .string()
      .trim()
      .min(1, 'Both password fields are required.')
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });