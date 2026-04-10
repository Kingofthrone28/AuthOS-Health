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
CREATE TYPE "RequirementSource" AS ENUM ('crd', 'dtr', 'manual');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'auth_specialist',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
    "dueAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,

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
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT,
    "completedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallTranscript" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "callSid" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
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
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "PatientRef_tenantId_idx" ON "PatientRef"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientRef_tenantId_fhirId_key" ON "PatientRef"("tenantId", "fhirId");

-- CreateIndex
CREATE INDEX "CoverageRef_tenantId_idx" ON "CoverageRef"("tenantId");

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
CREATE INDEX "PayerResponse_caseId_idx" ON "PayerResponse"("caseId");

-- CreateIndex
CREATE INDEX "Task_caseId_idx" ON "Task"("caseId");

-- CreateIndex
CREATE INDEX "Task_tenantId_assignedTo_idx" ON "Task"("tenantId", "assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "CallTranscript_callSid_key" ON "CallTranscript"("callSid");

-- CreateIndex
CREATE INDEX "CallTranscript_caseId_idx" ON "CallTranscript"("caseId");

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
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "CallTranscript" ADD CONSTRAINT "CallTranscript_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AuthorizationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedEvent" ADD CONSTRAINT "ExtractedEvent_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "CallTranscript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AuthorizationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
