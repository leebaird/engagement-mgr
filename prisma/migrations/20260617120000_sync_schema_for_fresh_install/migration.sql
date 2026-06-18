-- Bring databases created from the original init migration up to the current schema.
-- Each step is conditional so existing deployments that already have the schema are unaffected.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementStatus' AND e.enumlabel = 'Planning'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementStatus' AND e.enumlabel = 'Recon'
  ) THEN
    ALTER TYPE "EngagementStatus" RENAME VALUE 'Planning' TO 'Recon';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Engagement' AND column_name = 'startPlanning'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Engagement' AND column_name = 'startRecon'
  ) THEN
    ALTER TABLE "Engagement" RENAME COLUMN "startPlanning" TO "startRecon";
    ALTER TABLE "Engagement" RENAME COLUMN "endPlanning" TO "endRecon";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Engagement' AND column_name = 'startDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Engagement' AND column_name = 'startTesting'
  ) THEN
    ALTER TABLE "Engagement" RENAME COLUMN "startDate" TO "startTesting";
    ALTER TABLE "Engagement" RENAME COLUMN "endDate" TO "endTesting";
  END IF;
END $$;

ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "chargeCode" TEXT;
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "focus" TEXT;
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "targets" TEXT;
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "exclusions" TEXT;
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "startPrep" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "endPrep" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "startRecon" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "endRecon" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "startTesting" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "endTesting" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "startReporting" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "endReporting" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN IF NOT EXISTS "outbrief" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Engagement' AND column_name = 'scopeTargets'
  ) THEN
    UPDATE "Engagement" SET "targets" = "scopeTargets" WHERE "targets" IS NULL AND "scopeTargets" IS NOT NULL;
    ALTER TABLE "Engagement" DROP COLUMN "scopeTargets";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Engagement' AND column_name = 'scopeExclusions'
  ) THEN
    UPDATE "Engagement" SET "exclusions" = "scopeExclusions" WHERE "exclusions" IS NULL AND "scopeExclusions" IS NOT NULL;
    ALTER TABLE "Engagement" DROP COLUMN "scopeExclusions";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "_EngagementContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EngagementContacts_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE TABLE IF NOT EXISTS "_TrustedAgents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TrustedAgents_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX IF NOT EXISTS "_EngagementContacts_B_index" ON "_EngagementContacts"("B");
CREATE INDEX IF NOT EXISTS "_TrustedAgents_B_index" ON "_TrustedAgents"("B");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Engagement' AND column_name = 'trustedAgentId'
  ) THEN
    INSERT INTO "_TrustedAgents" ("A", "B")
    SELECT DISTINCT e."trustedAgentId", e."id"
    FROM "Engagement" AS e
    WHERE e."trustedAgentId" IS NOT NULL
    ON CONFLICT DO NOTHING;

    ALTER TABLE "Engagement" DROP CONSTRAINT IF EXISTS "Engagement_trustedAgentId_fkey";
    ALTER TABLE "Engagement" DROP COLUMN "trustedAgentId";
  END IF;
END $$;

ALTER TABLE "Engagement" ALTER COLUMN "type" DROP NOT NULL;
ALTER TABLE "Engagement" ALTER COLUMN "location" DROP NOT NULL;

ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "category" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Finding' AND column_name = 'observation'
  ) THEN
    UPDATE "EngagementFindingContext" AS ctx
    SET "observation" = f."observation"
    FROM "Finding" AS f
    WHERE ctx."findingId" = f."id"
      AND ctx."observation" IS NULL
      AND f."observation" IS NOT NULL;

    ALTER TABLE "Finding" DROP COLUMN "observation";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Finding' AND column_name = 'affectedHosts'
  ) THEN
    UPDATE "EngagementFindingContext" AS ctx
    SET "affected_hosts" = f."affectedHosts"
    FROM "Finding" AS f
    WHERE ctx."findingId" = f."id"
      AND ctx."affected_hosts" IS NULL
      AND f."affectedHosts" IS NOT NULL;

    ALTER TABLE "Finding" DROP COLUMN "affectedHosts";
  END IF;
END $$;

ALTER TABLE "Finding" DROP CONSTRAINT IF EXISTS "Finding_engagementId_fkey";
ALTER TABLE "Finding" ALTER COLUMN "engagementId" DROP NOT NULL;
ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_engagementId_fkey"
  FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "discord" TEXT;
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "github" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_EngagementContacts_A_fkey'
  ) THEN
    ALTER TABLE "_EngagementContacts"
      ADD CONSTRAINT "_EngagementContacts_A_fkey"
      FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_EngagementContacts_B_fkey'
  ) THEN
    ALTER TABLE "_EngagementContacts"
      ADD CONSTRAINT "_EngagementContacts_B_fkey"
      FOREIGN KEY ("B") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_TrustedAgents_A_fkey'
  ) THEN
    ALTER TABLE "_TrustedAgents"
      ADD CONSTRAINT "_TrustedAgents_A_fkey"
      FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_TrustedAgents_B_fkey'
  ) THEN
    ALTER TABLE "_TrustedAgents"
      ADD CONSTRAINT "_TrustedAgents_B_fkey"
      FOREIGN KEY ("B") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;