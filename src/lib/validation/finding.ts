import { z } from 'zod';

import { optionalUuidSchema, uuidSchema } from '@/lib/validation/common';
import { findingSeveritySchema } from '@/lib/validation/enums';
import { requiredFormString, trimmedFormString } from '@/lib/validation/form';

export const findingSearchQuerySchema = z.string().trim().max(200);

const findingFieldsSchema = z.object({
  title: requiredFormString(500, 'Title is required.'),
  observation: trimmedFormString(10000),
  category: trimmedFormString(200),
  severity: z
    .union([findingSeveritySchema, z.null(), z.undefined()])
    .transform((value) => (value == null ? '' : value)),
  background: trimmedFormString(10000),
  remediation: trimmedFormString(10000),
  supportingLinks: trimmedFormString(10000),
  affectedHosts: trimmedFormString(10000),
});

export const createFindingSchema = findingFieldsSchema.extend({
  engagementId: optionalUuidSchema,
});

export const updateFindingSchema = findingFieldsSchema.extend({
  engagementId: optionalUuidSchema,
  engagementScoped: z
    .union([z.literal('true'), z.literal('false'), z.null(), z.undefined()])
    .transform((value) => value === 'true'),
});

export const screenshotDescriptionSchema = z.string().trim().max(500);

export const deleteScreenshotSchema = z.object({
  screenshotId: uuidSchema,
  findingId: uuidSchema,
});
