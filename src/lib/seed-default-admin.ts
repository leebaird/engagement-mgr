import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { ARGON2_OPTIONS, validatePasswordComplexity } from '@/lib/auth/password';
import { randomBytes } from 'crypto';

export function generateTemporaryAdminPassword(): string {
  return `${randomBytes(18).toString('base64')}aA1!`;
}

export async function prepareDefaultAdminUser(password = generateTemporaryAdminPassword()): Promise<{
  data: {
    username: string;
    passwordHash: string;
    role: 'Admin';
    lastPasswordChange: Date;
  };
  credentials: {
    username: string;
    password: string;
  };
}> {
  if (!validatePasswordComplexity(password).valid) {
    throw new Error('Default admin password does not meet the password policy');
  }

  return {
    data: {
      username: 'admin',
      passwordHash: await argon2.hash(password, ARGON2_OPTIONS),
      role: 'Admin',
      lastPasswordChange: new Date(0),
    },
    credentials: { username: 'admin', password },
  };
}

export async function seedDefaultAdminUser(password = generateTemporaryAdminPassword()): Promise<{
  username: string;
  password: string;
}> {
  const admin = await prepareDefaultAdminUser(password);
  await prisma.user.create({
    data: admin.data,
  });

  return admin.credentials;
}
