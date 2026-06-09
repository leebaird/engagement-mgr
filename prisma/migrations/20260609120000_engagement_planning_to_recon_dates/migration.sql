-- Rename planning schedule columns to recon
ALTER TABLE "Engagement" RENAME COLUMN "startPlanning" TO "startRecon";
ALTER TABLE "Engagement" RENAME COLUMN "endPlanning" TO "endRecon";