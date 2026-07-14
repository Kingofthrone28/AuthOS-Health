-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'clinician', 'auth_specialist', 'manager', 'read_only');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('standard', 'expedited', 'urgent');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('new', 'requirements_found', 'docs_missing', 'ready_to_submit', 'submitted', 'pending_payer', 'more_info_requested', 'peer_review_needed', 'approved', 'denied', 'appealed', 'closed');

-- CreateEnum
CREATE TYPE "SubmissionProtocol" AS ENUM ('pas', 'fhir', 'x12', 'portal');

-- CreateEnum
CREATE TYPE "PayerDecision" AS ENUM ('approved', 'denied', 'more_info', 'peer_review', 'pending');

-- CreateEnum
CREATE TYPE "ExtractedEventType" AS ENUM ('reference_number', 'auth_status', 'missing_document', 'denial_reason', 'peer_review_required', 'callback_deadline', 'approval_number', 'other');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CallTranscriptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RequirementSource" AS ENUM ('crd', 'dtr', 'manual');

-- CreateEnum
CREATE TYPE "SsoProvider" AS ENUM ('oidc', 'saml');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ssoProvider" "SsoProvider",
    "ssoIssuerUrl" TEXT,
    "ssoClientId" TEXT,
    "ssoClientSecret" TEXT,
    "fhirServerUrl" TEXT,
    "payerEndpoint" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'auth_specialist',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientRef" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fhirId" TEXT NOT NULL,
    "mrn" TEXT,
    "name" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "gender" TEXT,

    CONSTRAINT "PatientRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageRef" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fhirId" TEXT,
    "patientRefId" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerId" TEXT,
    "planName" TEXT,
    "memberId" TEXT NOT NULL,
    "groupId" TEXT,

    CONSTRAINT "CoverageRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRef" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fhirId" TEXT NOT NULL,
    "patientRefId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceCode" TEXT,
    "orderingProviderRefId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizationCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientRefId" TEXT NOT NULL,
    "coverageRefId" TEXT NOT NULL,
    "orderRefId" TEXT,
    "serviceType" TEXT NOT NULL,
    "serviceCode" TEXT,
    "priority" "CasePriority" NOT NULL DEFAULT 'standard',
    "status" "CaseStatus" NOT NULL DEFAULT 'new',
    "payerName" TEXT NOT NULL,
    "payerCaseRef" TEXT,
    "approvalNumber" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "slaWarningAt" TIMESTAMP(3),
    "lastFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AuthorizationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizationRequirement" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "source" "RequirementSource" NOT NULL DEFAULT 'manual',

    CONSTRAINT "AuthorizationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "protocol" "SubmissionProtocol" NOT NULL,
    "payloadRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayerResponse" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "decision" "PayerDecision" NOT NULL,
    "denialReason" TEXT,
    "denialCode" TEXT,
    "authNumber" TEXT,
    "rawResponseRef" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayerResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallTranscript" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "tenantId" TEXT NOT NULL,
    "callSid" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" "CallTranscriptStatus" NOT NULL DEFAULT 'COMPLETED',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "transcriptText" TEXT,
    "transcriptRef" TEXT,

    CONSTRAINT "CallTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedEvent" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" "ExtractedEventType" NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageRef" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_tenantId_userId_idx" ON "RefreshToken"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tenantId_expiresAt_idx" ON "RefreshToken"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "PatientRef_tenantId_idx" ON "PatientRef"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientRef_tenantId_fhirId_key" ON "PatientRef"("tenantId", "fhirId");

-- CreateIndex
CREATE INDEX "CoverageRef_tenantId_idx" ON "CoverageRef"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CoverageRef_tenantId_fhirId_key" ON "CoverageRef"("tenantId", "fhirId");

-- CreateIndex
CREATE INDEX "OrderRef_tenantId_idx" ON "OrderRef"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderRef_tenantId_fhirId_key" ON "OrderRef"("tenantId", "fhirId");

-- CreateIndex
CREATE INDEX "AuthorizationCase_tenantId_status_idx" ON "AuthorizationCase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AuthorizationCase_tenantId_assignedTo_idx" ON "AuthorizationCase"("tenantId", "assignedTo");

-- CreateIndex
CREATE INDEX "AuthorizationCase_tenantId_dueAt_idx" ON "AuthorizationCase"("tenantId", "dueAt");

-- CreateIndex
CREATE INDEX "AuthorizationRequirement_caseId_idx" ON "AuthorizationRequirement"("caseId");

-- CreateIndex
CREATE INDEX "AuthorizationRequirement_tenantId_idx" ON "AuthorizationRequirement"("tenantId");

-- CreateIndex
CREATE INDEX "Submission_caseId_idx" ON "Submission"("caseId");

-- CreateIndex
CREATE INDEX "Submission_tenantId_status_idx" ON "Submission"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PayerResponse_caseId_idx" ON "PayerResponse"("caseId");

-- CreateIndex
CREATE INDEX "Task_caseId_idx" ON "Task"("caseId");

-- CreateIndex
CREATE INDEX "Task_tenantId_requirementId_idx" ON "Task"("tenantId", "requirementId");

-- CreateIndex
CREATE INDEX "Task_tenantId_assignedTo_idx" ON "Task"("tenantId", "assignedTo");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_idx" ON "Task"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CallTranscript_callSid_key" ON "CallTranscript"("callSid");

-- CreateIndex
CREATE INDEX "CallTranscript_caseId_idx" ON "CallTranscript"("caseId");

-- CreateIndex
CREATE INDEX "CallTranscript_tenantId_status_idx" ON "CallTranscript"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ExtractedEvent_caseId_idx" ON "ExtractedEvent"("caseId");

-- CreateIndex
CREATE INDEX "ExtractedEvent_tenantId_reviewStatus_idx" ON "ExtractedEvent"("tenantId", "reviewStatus");

-- CreateIndex
CREATE INDEX "Attachment_caseId_idx" ON "Attachment"("caseId");

-- CreateIndex
CREATE INDEX "Attachment_tenantId_idx" ON "Attachment"("tenantId");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_entityId_idx" ON "AuditEvent"("tenantId", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_entityType_idx" ON "AuditEvent"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_idx" ON "AuditEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationCase" ADD CONSTRAINT "AuthorizationCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationCase" ADD CONSTRAINT "AuthorizationCase_patientRefId_fkey" FOREIGN KEY ("patientRefId") REFERENCES "PatientRef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationCase" ADD CONSTRAINT "AuthorizationCase_coverageRefId_fkey" FOREIGN KEY ("coverageRefId") REFERENCES "CoverageRef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationCase" ADD CONSTRAINT "AuthorizationCase_orderRefId_fkey" FOREIGN KEY ("orderRefId") REFERENCES "OrderRef"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationRequirement" ADD CONSTRAINT "AuthorizationRequirement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AuthorizationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AuthorizationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerResponse" ADD CONSTRAINT "PayerResponse_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AuthorizationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "AuthorizationRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTranscript" ADD CONSTRAINT "CallTranscript_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AuthorizationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedEvent" ADD CONSTRAINT "ExtractedEvent_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "CallTranscript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AuthorizationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL security controls not represented by the Prisma schema.
-- Every application transaction must set app.current_tenant with SET LOCAL.
ALTER TABLE "AuthorizationCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthorizationRequirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayerResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallTranscript" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtractedEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PatientRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoverageRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantSettings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "AuthorizationCase" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuthorizationRequirement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Submission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PayerResponse" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CallTranscript" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExtractedEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PatientRef" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CoverageRef" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrderRef" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantSettings" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_authorization_case ON "AuthorizationCase"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_authorization_requirement ON "AuthorizationRequirement"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_submission ON "Submission"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_payer_response ON "PayerResponse"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_task ON "Task"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_call_transcript ON "CallTranscript"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_extracted_event ON "ExtractedEvent"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_attachment ON "Attachment"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_audit_event ON "AuditEvent"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_user ON "User"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY refresh_token_tenant_isolation ON "RefreshToken"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_patient_ref ON "PatientRef"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_coverage_ref ON "CoverageRef"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_order_ref ON "OrderRef"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_tenant_settings ON "TenantSettings"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.environment', true), 'development') <> 'production' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'AuditEvent rows are immutable';
END;
$$;

CREATE TRIGGER audit_event_immutable
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

