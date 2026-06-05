-- CreateTable
CREATE TABLE "EngagementFindingContext" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "observation" TEXT,
    "affected_hosts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementFindingContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EngagementFindingContext_findingId_key" ON "EngagementFindingContext"("findingId");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementFindingContext_engagementId_findingId_key" ON "EngagementFindingContext"("engagementId", "findingId");

-- AddForeignKey
ALTER TABLE "EngagementFindingContext" ADD CONSTRAINT "EngagementFindingContext_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementFindingContext" ADD CONSTRAINT "EngagementFindingContext_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;