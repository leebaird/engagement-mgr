-- Fresh-install bootstrap: EngagementStatus and Role values that predate this migration chain.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EngagementStatus') THEN
    CREATE TYPE "EngagementStatus" AS ENUM ('PLANNING', 'PREP', 'LIVE', 'REPORTING', 'COMPLETE', 'ROE');
  END IF;
END $$;

ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "status" "EngagementStatus";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'OPERATOR'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'USER'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'OPERATOR' TO 'USER';
  END IF;
END $$;