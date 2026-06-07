import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');
  
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const passwordHash = await argon2.hash('admin', {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
    });

    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash,
        role: 'Admin',
      },
    });
    console.log(`Created default admin user with ID: ${admin.id}`);
  } else {
    console.log('Admin user already exists, skipping...');
  }
  
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
