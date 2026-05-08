CREATE TYPE "CallTranscriptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

ALTER TABLE "CallTranscript"
  ADD COLUMN "status" "CallTranscriptStatus" NOT NULL DEFAULT 'COMPLETED',
  ALTER COLUMN "caseId" DROP NOT NULL;

ALTER TABLE "CallTranscript"
  DROP CONSTRAINT "CallTranscript_caseId_fkey";

ALTER TABLE "CallTranscript"
  ADD CONSTRAINT "CallTranscript_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "AuthorizationCase"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CallTranscript_tenantId_status_idx" ON "CallTranscript"("tenantId", "status");
