import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

const globalForDatabase = global as unknown as {
  pool?: Pool;
  prisma?: PrismaClient;
};

const pool = globalForDatabase.pool ?? new Pool({ connectionString });
const prisma = globalForDatabase.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.pool = pool;
  globalForDatabase.prisma = prisma;
}

export { pool, prisma };
