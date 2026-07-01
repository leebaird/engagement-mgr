import { z } from 'zod';

import { uuidSchema } from '@/lib/validation/common';
import { optionalFormEmail, optionalFormString, requiredFormString } from '@/lib/validation/form';

export const createContactSchema = z.object({
  clientId: uuidSchema,
  name: requiredFormString(200, 'Client and Name are required.'),
  title: optionalFormString(200),
  email: optionalFormEmail(),
  phoneNumber: optionalFormString(30),
  notes: optionalFormString(5000),
});

export const updateContactSchema = createContactSchema;