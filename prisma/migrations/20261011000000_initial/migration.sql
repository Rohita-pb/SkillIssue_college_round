CREATE TABLE "WorkspaceState" (
  "id" TEXT PRIMARY KEY,
  "version" INTEGER NOT NULL DEFAULT 1,
  "state" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "TargetRecord" (
  "tenantId" TEXT NOT NULL, "id" TEXT NOT NULL, "snapshot" JSONB NOT NULL,
  PRIMARY KEY ("tenantId", "id")
);
CREATE TABLE "CampaignRecord" (
  "tenantId" TEXT NOT NULL, "id" TEXT NOT NULL, "targetId" TEXT NOT NULL,
  "status" TEXT NOT NULL, "completed" INTEGER NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL,
  "snapshot" JSONB NOT NULL,
  PRIMARY KEY ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "targetId") REFERENCES "TargetRecord"("tenantId", "id")
);
CREATE TABLE "TraceRecord" (
  "tenantId" TEXT NOT NULL, "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL, "snapshot" JSONB NOT NULL,
  PRIMARY KEY ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "campaignId") REFERENCES "CampaignRecord"("tenantId", "id")
);
CREATE TABLE "ValidationRecord" (
  "tenantId" TEXT NOT NULL, "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL,
  "snapshot" JSONB NOT NULL, PRIMARY KEY ("tenantId", "id")
);
CREATE INDEX "CampaignRecord_status_startedAt_idx" ON "CampaignRecord"("status", "startedAt");
CREATE INDEX "TraceRecord_tenantId_campaignId_createdAt_idx" ON "TraceRecord"("tenantId", "campaignId", "createdAt");
