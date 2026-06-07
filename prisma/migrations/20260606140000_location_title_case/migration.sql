-- Rename Location enum values to title case
ALTER TYPE "Location" RENAME VALUE 'INTERNAL' TO 'Internal';
ALTER TYPE "Location" RENAME VALUE 'EXTERNAL' TO 'External';