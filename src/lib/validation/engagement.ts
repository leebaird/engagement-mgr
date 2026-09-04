import { z } from 'zod';

import { uuidSchema } from '@/lib/validation/common';
import {
  optionalEngagementStatus,
  optionalEngagementType,
  optionalLocation,
} from '@/lib/validation/enums';
import { optionalFormDate, requiredFormString, trimmedFormString } from '@/lib/validation/form';

const optionalClientIdSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (value == null ? '' : String(value).trim()))
  .pipe(z.union([z.literal(''), uuidSchema]));

const engagementBaseSchema = z.object({
  codeName: requiredFormString(200, 'A Code Name is required.'),
  clientId: optionalClientIdSchema,
  clientName: trimmedFormString(200),
  type: optionalEngagementType(),
  location: optionalLocation(),
  focus: trimmedFormString(500),
  objectives: trimmedFormString(10000),
  targets: trimmedFormString(10000),
  exclusions: trimmedFormString(10000),
  notes: trimmedFormString(10000),
});

export const updateEngagementSchema = engagementBaseSchema
  .extend({
    status: optionalEngagementStatus(),
    chargeCode: trimmedFormString(100),
  })
  .refine((data) => Boolean(data.clientId || data.clientName), {
    message: 'A Client is required.',
  });

export const engagementScheduleSchema = z.object({
  startPrep: optionalFormDate(),
  endPrep: optionalFormDate(),
  startRecon: optionalFormDate(),
  endRecon: optionalFormDate(),
  startTesting: optionalFormDate(),
  endTesting: optionalFormDate(),
  startReporting: optionalFormDate(),
  endReporting: optionalFormDate(),
  outbrief: optionalFormDate(),
});

export const engagementIdSchema = uuidSchema;
