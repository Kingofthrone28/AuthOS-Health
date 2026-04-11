-- Add fhirId to CoverageRef for EHR upsert support
ALTER TABLE "CoverageRef" ADD COLUMN "fhirId" TEXT;

-- Add unique constraint for upsert-by-fhirId
CREATE UNIQUE INDEX "CoverageRef_tenantId_fhirId_key" ON "CoverageRef"("tenantId", "fhirId");
