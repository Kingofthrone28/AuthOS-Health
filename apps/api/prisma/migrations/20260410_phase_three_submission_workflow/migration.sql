-- Phase 3: Submission workflow, task management, and automated follow-up

-- AuthorizationCase: add escalation and follow-up tracking
ALTER TABLE "AuthorizationCase" ADD COLUMN "escalatedAt" TIMESTAMP(3);
ALTER TABLE "AuthorizationCase" ADD COLUMN "lastFollowUpAt" TIMESTAMP(3);

-- Submission: add retry and status tracking
ALTER TABLE "Submission" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Submission" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Submission" ADD COLUMN "maxRetries" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Submission" ADD COLUMN "nextRetryAt" TIMESTAMP(3);

-- Task: add status and completedBy
ALTER TABLE "Task" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open';
ALTER TABLE "Task" ADD COLUMN "completedBy" TEXT;

-- New indexes
CREATE INDEX "Submission_tenantId_status_idx" ON "Submission"("tenantId", "status");
CREATE INDEX "Task_tenantId_status_idx" ON "Task"("tenantId", "status");
