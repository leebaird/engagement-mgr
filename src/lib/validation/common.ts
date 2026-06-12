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

export const uuidSchema = z.string().uuid('Invalid ID.');

export const userIdSchema = uuidSchema;

export const optionalUuidSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = value == null ? '' : String(value).trim();
    return trimmed === '' ? undefined : trimmed;
  })
  .pipe(uuidSchema.optional());