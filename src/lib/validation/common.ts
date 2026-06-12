import { z } from 'zod';

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input.';
}

export const roleSchema = z.enum(['Admin', 'User'], {
  message: 'Role must be Admin or User.',
});

export const usernameSchema = z
  .string()
  .trim()
  .min(1, 'Username is required.')
  .max(100, 'Username is too long.');

export const userIdSchema = z.string().uuid('Invalid user ID.');