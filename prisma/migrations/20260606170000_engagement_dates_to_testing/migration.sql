-- Rename engagement date fields to testing window
ALTER TABLE "Engagement" RENAME COLUMN "startDate" TO "startTesting";
ALTER TABLE "Engagement" RENAME COLUMN "endDate" TO "endTesting";