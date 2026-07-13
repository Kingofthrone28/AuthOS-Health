ALTER TABLE "Task"
  ADD COLUMN "requirementId" TEXT;

CREATE INDEX "Task_tenantId_requirementId_idx"
  ON "Task"("tenantId", "requirementId");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_requirementId_fkey"
  FOREIGN KEY ("requirementId") REFERENCES "AuthorizationRequirement"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
