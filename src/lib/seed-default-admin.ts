import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { ARGON2_OPTIONS, validatePasswordComplexity } from '@/lib/auth/password';
import { randomBytes } from 'crypto';

function generateTemporaryAdminPassword(): string {
  return `${randomBytes(18).toString('base64')}aA1!`;
}

export async function seedDefaultAdminUser(password = generateTemporaryAdminPassword()): Promise<{
  username: string;
  password: string;
}> {
  if (!validatePasswordComplexity(password).valid) {
    throw new Error('Default admin password does not meet the password policy');
  }

  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      role: 'Admin',
      lastPasswordChange: new Date(0),
    },
  });

  return { username: 'admin', password };
}