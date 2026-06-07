-- Rename EngagementStatus enum values to title case (ROE unchanged)
ALTER TYPE "EngagementStatus" RENAME VALUE 'PLANNING' TO 'Planning';
ALTER TYPE "EngagementStatus" RENAME VALUE 'PREP' TO 'Prep';
ALTER TYPE "EngagementStatus" RENAME VALUE 'LIVE' TO 'Live';
ALTER TYPE "EngagementStatus" RENAME VALUE 'REPORTING' TO 'Reporting';
ALTER TYPE "EngagementStatus" RENAME VALUE 'COMPLETE' TO 'Complete';