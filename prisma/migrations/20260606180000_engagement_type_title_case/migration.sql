-- Rename EngagementType enum values to title case (AI and USB stay uppercase)
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'MULTI';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'PHISHING';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'PHYSICAL';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'USB_DROP';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'VISHING';
ALTER TYPE "EngagementType" ADD VALUE IF NOT EXISTS 'WEB_APP';

ALTER TYPE "EngagementType" RENAME VALUE 'CODE_REVIEW' TO 'Code_Review';
ALTER TYPE "EngagementType" RENAME VALUE 'FIREWALL' TO 'Firewall';
ALTER TYPE "EngagementType" RENAME VALUE 'MULTI' TO 'Multi';
ALTER TYPE "EngagementType" RENAME VALUE 'PENTEST' TO 'Pentest';
ALTER TYPE "EngagementType" RENAME VALUE 'PHISHING' TO 'Phishing';
ALTER TYPE "EngagementType" RENAME VALUE 'PHYSICAL' TO 'Physical';
ALTER TYPE "EngagementType" RENAME VALUE 'PURPLE_TEAM' TO 'Purple_Team';
ALTER TYPE "EngagementType" RENAME VALUE 'RED_TEAM' TO 'Red_Team';
ALTER TYPE "EngagementType" RENAME VALUE 'USB_DROP' TO 'USB_Drop';
ALTER TYPE "EngagementType" RENAME VALUE 'VISHING' TO 'Vishing';
ALTER TYPE "EngagementType" RENAME VALUE 'WEB_APP' TO 'Web_App';
ALTER TYPE "EngagementType" RENAME VALUE 'WIRELESS' TO 'Wireless';