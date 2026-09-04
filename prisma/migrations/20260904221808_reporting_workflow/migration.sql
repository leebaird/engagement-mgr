-- CreateEnum
CREATE TYPE "FindingReviewStatus" AS ENUM ('Draft', 'Ready', 'ChangesRequested', 'Approved');

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "importFingerprint" TEXT,
ADD COLUMN     "reviewStatus" "FindingReviewStatus" NOT NULL DEFAULT 'Draft',
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Screenshot" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FindingTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FindingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingRevision" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FindingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingDraft" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseVersion" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FindingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingComment" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FindingComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementReport" (
    "engagementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL DEFAULT '',
    "findingIds" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementReport_pkey" PRIMARY KEY ("engagementId")
);

-- CreateTable
CREATE TABLE "IssuedReport" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "pdf" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FindingRevision_findingId_version_key" ON "FindingRevision"("findingId", "version");

-- CreateIndex
CREATE INDEX "FindingDraft_userId_idx" ON "FindingDraft"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FindingDraft_findingId_userId_key" ON "FindingDraft"("findingId", "userId");

-- CreateIndex
CREATE INDEX "FindingComment_findingId_createdAt_idx" ON "FindingComment"("findingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedReport_engagementId_version_key" ON "IssuedReport"("engagementId", "version");

-- CreateIndex
CREATE INDEX "Finding_reviewStatus_idx" ON "Finding"("reviewStatus");

-- CreateIndex
CREATE INDEX "Finding_authorId_idx" ON "Finding"("authorId");

-- CreateIndex
CREATE INDEX "Finding_reviewerId_idx" ON "Finding"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_engagementId_importFingerprint_key" ON "Finding"("engagementId", "importFingerprint");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingRevision" ADD CONSTRAINT "FindingRevision_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingDraft" ADD CONSTRAINT "FindingDraft_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingDraft" ADD CONSTRAINT "FindingDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingComment" ADD CONSTRAINT "FindingComment_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementReport" ADD CONSTRAINT "EngagementReport_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedReport" ADD CONSTRAINT "IssuedReport_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
