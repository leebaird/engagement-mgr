import 'dotenv/config';
import { pool, prisma } from '../src/lib/db';
import {
  generateTemporaryAdminPassword,
  seedDefaultAdminUser,
} from '../src/lib/seed-default-admin';
import { replaceStaleInitialAdminCredentials } from '../src/lib/initial-admin-credentials';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  console.log('Start seeding...');

  const lockClient = await pool.connect();
  const credentialsPath = resolve(
    process.env.INITIAL_ADMIN_CREDENTIALS_FILE ?? 'initial-admin-credentials.txt'
  );
  try {
    await lockClient.query('SELECT pg_advisory_lock($1::integer)', [1_394_517_093]);
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (!existingAdmin) {
      const password = generateTemporaryAdminPassword();
      await replaceStaleInitialAdminCredentials(credentialsPath, {
        username: 'admin',
        password,
      });
      try {
        await seedDefaultAdminUser(password);
      } catch (error) {
        await rm(credentialsPath, { force: true });
        throw error;
      }
      console.log(`Created default admin user. Credentials were written to ${credentialsPath}.`);
      console.log('Change the temporary password, then delete the credentials file.');
    } else {
      console.log('Admin user already exists, skipping...');
    }
  } finally {
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1::integer)', [1_394_517_093]);
    } finally {
      lockClient.release();
    }
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
