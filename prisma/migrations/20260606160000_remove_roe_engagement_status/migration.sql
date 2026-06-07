-- Remove ROE from EngagementStatus enum (recreate type without the value)
CREATE TYPE "EngagementStatus_new" AS ENUM ('Planning', 'Prep', 'Testing', 'Reporting', 'Complete');

ALTER TABLE "Engagement"
  ALTER COLUMN "status" TYPE "EngagementStatus_new"
  USING ("status"::text::"EngagementStatus_new");

DROP TYPE "EngagementStatus";
ALTER TYPE "EngagementStatus_new" RENAME TO "EngagementStatus";