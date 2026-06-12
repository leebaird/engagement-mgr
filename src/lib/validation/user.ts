import { z } from 'zod';

import { roleSchema, usernameSchema } from '@/lib/validation/common';

export const createUserSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'All fields are required.'),
  role: roleSchema,
});

export const updateUserSchema = z.object({
  username: usernameSchema,
  password: z.string(),
  role: roleSchema,
});