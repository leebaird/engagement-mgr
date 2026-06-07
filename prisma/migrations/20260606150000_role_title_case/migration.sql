-- Rename Role enum values to title case
ALTER TYPE "Role" RENAME VALUE 'ADMIN' TO 'Admin';
ALTER TYPE "Role" RENAME VALUE 'USER' TO 'User';

-- Update default for new users
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'User'::"Role";