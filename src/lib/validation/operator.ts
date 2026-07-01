import { z } from 'zod';

import { optionalFormEmail, optionalFormString, requiredFormString } from '@/lib/validation/form';

export const createOperatorSchema = z.object({
  name: requiredFormString(200, 'Name is required.'),
  title: optionalFormString(200),
  email: optionalFormEmail(),
  phoneNumber: optionalFormString(30),
  discord: optionalFormString(100),
  github: optionalFormString(100),
  notes: optionalFormString(5000),
});

export const updateOperatorSchema = createOperatorSchema;