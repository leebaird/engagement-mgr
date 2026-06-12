import { z } from 'zod';

import { usernameSchema } from '@/lib/validation/common';

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const changePasswordSchema = z
  .object({
    password: z.string().trim().min(1, 'Both password fields are required.'),
    confirmPassword: z.string().trim().min(1, 'Both password fields are required.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });