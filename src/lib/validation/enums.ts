import { z } from 'zod';

export const engagementStatusSchema = z.enum([
  'Prep',
  'Recon',
  'Testing',
  'Reporting',
  'Complete',
]);

export const engagementTypeSchema = z.enum([
  'AI',
  'Code_Review',
  'Firewall',
  'Multi',
  'Pentest',
  'Phishing',
  'Physical',
  'Purple_Team',
  'Red_Team',
  'USB_Drop',
  'Vishing',
  'Web_App',
  'Wireless',
]);

export const locationSchema = z.enum(['Internal', 'External']);

export const findingSeveritySchema = z.enum(['Critical', 'High', 'Medium', 'Low', 'Info', '']);

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
  'WI', 'WY', 'DC',
]);

export const stateCodeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (value == null ? '' : String(value).trim().toUpperCase()))
  .pipe(
    z
      .string()
      .max(2)
      .refine((value) => value === '' || US_STATE_CODES.has(value), 'Invalid state code.')
  );

export const zipCodeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (value == null ? '' : String(value).trim()))
  .pipe(
    z
      .string()
      .max(10)
      .refine((value) => value === '' || /^\d{5}(-\d{4})?$/.test(value), 'ZIP must be 12345 or 12345-6789.')
  );

export const cityNameSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (value == null ? '' : String(value).trim()))
  .pipe(
    z
      .string()
      .max(100)
      .refine((value) => value === '' || /^[A-Za-z\s]+$/.test(value), 'Only letters and spaces allowed.')
  );

export function optionalEngagementType() {
  return z
    .union([engagementTypeSchema, z.literal(''), z.null(), z.undefined()])
    .transform((value) => (value == null || value === '' ? null : value));
}

export function optionalEngagementStatus() {
  return z
    .union([engagementStatusSchema, z.literal(''), z.null(), z.undefined()])
    .transform((value) => (value == null || value === '' ? null : value));
}

export function optionalLocation() {
  return z
    .union([locationSchema, z.literal(''), z.null(), z.undefined()])
    .transform((value) => (value == null || value === '' ? null : value));
}