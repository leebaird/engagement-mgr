import * as argon2 from 'argon2';
import { prisma } from '@/lib/db';
import { ARGON2_OPTIONS } from '@/lib/auth/password';

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    return false;
  }

  try {
    return await argon2.verify(user.passwordHash, password, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}