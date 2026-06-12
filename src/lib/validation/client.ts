import { z } from 'zod';

import { cityNameSchema, stateCodeSchema, zipCodeSchema } from '@/lib/validation/enums';
import { requiredFormString, trimmedFormString } from '@/lib/validation/form';

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
  'WI', 'WY', 'DC',
]);

const clientFormFieldsSchema = z.object({
  companyName: requiredFormString(200, 'Company Name is required.'),
  address: trimmedFormString(500),
  city: cityNameSchema,
  state: stateCodeSchema,
  zip: zipCodeSchema,
  phoneNumber: trimmedFormString(30),
  website: trimmedFormString(500),
  notes: trimmedFormString(5000),
});

export const createClientSchema = clientFormFieldsSchema;

export const updateClientDataSchema = z.object({
  company: z.string().trim().min(1, 'Company Name is required.').max(200),
  address: z.string().max(500).nullable(),
  city: z
    .string()
    .max(100)
    .nullable()
    .refine((value) => value == null || value === '' || /^[A-Za-z\s]+$/.test(value), {
      message: 'Only letters and spaces allowed.',
    }),
  state: z
    .string()
    .max(2)
    .nullable()
    .refine(
      (value) => value == null || value === '' || US_STATE_CODES.has(value.toUpperCase()),
      { message: 'Invalid state code.' }
    ),
  zip: z
    .string()
    .max(10)
    .nullable()
    .refine((value) => value == null || value === '' || /^\d{5}(-\d{4})?$/.test(value), {
      message: 'ZIP must be 12345 or 12345-6789.',
    }),
  website: z.string().max(500).nullable(),
  phone: z.string().max(30).nullable(),
  notes: z.string().max(5000).nullable(),
});