-- Add engagement schedule date fields
ALTER TABLE "Engagement" ADD COLUMN "startPlanning" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN "endPlanning" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN "startPrep" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN "endPrep" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN "startReporting" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN "endReporting" TIMESTAMP(3);
ALTER TABLE "Engagement" ADD COLUMN "outbrief" TIMESTAMP(3);