import { z } from 'zod';

import { MAX_PASSWORD_LENGTH } from '@/lib/auth/password';
import { roleSchema, usernameSchema } from '@/lib/validation/common';

export const createUserSchema = z.object({
  username: usernameSchema,
  password: z
    .string()
    .min(1, 'All fields are required.')
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`),
  role: roleSchema,
});

export const updateUserSchema = z.object({
  username: usernameSchema,
  // Empty string means "leave password unchanged"
  password: z
    .string()
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`),
  role: roleSchema,
});