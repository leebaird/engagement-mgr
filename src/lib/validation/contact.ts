import { z } from 'zod';

import { uuidSchema } from '@/lib/validation/common';
import { optionalFormString, requiredFormString } from '@/lib/validation/form';

export const createContactSchema = z.object({
  clientId: uuidSchema,
  name: requiredFormString(200, 'Client and Name are required.'),
  title: optionalFormString(200),
  email: optionalFormString(320),
  phoneNumber: optionalFormString(30),
  notes: optionalFormString(5000),
});

export const updateContactSchema = createContactSchema;