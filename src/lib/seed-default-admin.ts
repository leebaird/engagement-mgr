import { prisma } from '@/lib/db';
import * as argon2 from 'argon2';
import { ARGON2_OPTIONS } from '@/lib/auth/password';

export async function seedDefaultAdminUser(): Promise<void> {
  const passwordHash = await argon2.hash('admin', ARGON2_OPTIONS);

  await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
}