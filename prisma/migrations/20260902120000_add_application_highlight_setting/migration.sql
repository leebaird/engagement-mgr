CREATE TYPE "HighlightColor" AS ENUM ('Pink', 'Blue', 'Teal', 'Green', 'Purple', 'Amber');

CREATE TABLE "ApplicationSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "highlightColor" "HighlightColor" NOT NULL DEFAULT 'Pink',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ApplicationSetting" ("id", "highlightColor", "updatedAt")
VALUES (1, 'Pink', CURRENT_TIMESTAMP);
