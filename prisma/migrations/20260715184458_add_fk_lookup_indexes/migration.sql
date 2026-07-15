-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE INDEX "Engagement_clientId_idx" ON "Engagement"("clientId");

-- CreateIndex
CREATE INDEX "Engagement_status_idx" ON "Engagement"("status");

-- CreateIndex
CREATE INDEX "EngagementFindingContext_engagementId_idx" ON "EngagementFindingContext"("engagementId");

-- CreateIndex
CREATE INDEX "Finding_engagementId_idx" ON "Finding"("engagementId");

-- CreateIndex
CREATE INDEX "Screenshot_findingId_idx" ON "Screenshot"("findingId");

-- CreateIndex
CREATE INDEX "Screenshot_filePath_idx" ON "Screenshot"("filePath");
