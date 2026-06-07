-- Add missing title-case engagement types, then rename legacy values when needed.
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'Multi';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'Phishing';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'Physical';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'USB_Drop';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'Vishing';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'Web_App';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'CODE_REVIEW'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Code_Review'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'CODE_REVIEW' TO 'Code_Review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'FIREWALL'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Firewall'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'FIREWALL' TO 'Firewall';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'MULTI'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Multi'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'MULTI' TO 'Multi';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'PENTEST'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Pentest'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'PENTEST' TO 'Pentest';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'PHISHING'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Phishing'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'PHISHING' TO 'Phishing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'PHYSICAL'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Physical'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'PHYSICAL' TO 'Physical';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'PURPLE_TEAM'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Purple_Team'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'PURPLE_TEAM' TO 'Purple_Team';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'RED_TEAM'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Red_Team'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'RED_TEAM' TO 'Red_Team';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'USB_DROP'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'USB_Drop'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'USB_DROP' TO 'USB_Drop';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'VISHING'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Vishing'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'VISHING' TO 'Vishing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'WEB_APP'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Web_App'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'WEB_APP' TO 'Web_App';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'WIRELESS'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EngagementType' AND e.enumlabel = 'Wireless'
  ) THEN
    ALTER TYPE "EngagementType" RENAME VALUE 'WIRELESS' TO 'Wireless';
  END IF;
END $$;