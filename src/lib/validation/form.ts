import { z } from 'zod';

import { firstZodError, uuidSchema } from '@/lib/validation/common';

export function trimmedFormString(max: number) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (value == null ? '' : String(value).trim()))
    .pipe(z.string().max(max));
}

export function requiredFormString(max: number, message: string) {
  return trimmedFormString(max).pipe(z.string().min(1, message));
}

export function optionalFormString(max: number) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = String(value).trim();
      return trimmed === '' ? null : trimmed;
    })
    .pipe(z.string().max(max).nullable());
}

export function optionalFormDate() {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .superRefine((value, context) => {
      const raw = value == null ? '' : String(value).trim();
      if (!raw) return;

      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        context.addIssue({ code: 'custom', message: 'Invalid date.' });
      }
    })
    .transform((value) => {
      const raw = value == null ? '' : String(value).trim();
      if (!raw) return null;
      return new Date(raw);
    });
}

export function parseFormUuidList(
  values: FormDataEntryValue[]
): { ok: true; ids: string[] } | { ok: false; error: string } {
  const ids = values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const parsed = z.array(uuidSchema).safeParse(ids);
  if (!parsed.success) {
    return { ok: false, error: firstZodError(parsed.error) };
  }

  return { ok: true, ids: parsed.data };
}