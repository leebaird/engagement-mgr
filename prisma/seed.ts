import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { seedDefaultAdminUser } from '../src/lib/seed-default-admin';

async function main() {
  console.log('Start seeding...');

  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    await seedDefaultAdminUser();
    console.log('Created default admin user (username: admin, password: admin)');
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