-- Row-Level Security policies for tenant isolation (defense-in-depth).
-- Application-level WHERE tenantId filters remain the primary mechanism;
-- RLS acts as a safety net to prevent cross-tenant data leakage.

-- Helper: each request sets app.current_tenant via SET LOCAL before queries.

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
ALTER TABLE "PatientRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoverageRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantSettings" ENABLE ROW LEVEL SECURITY;

-- Policies: allow access only when tenant_id matches the session variable.
-- The superuser / migration role bypasses RLS by default.

CREATE POLICY tenant_isolation_authorization_case ON "AuthorizationCase"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_authorization_requirement ON "AuthorizationRequirement"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_submission ON "Submission"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_payer_response ON "PayerResponse"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_task ON "Task"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_call_transcript ON "CallTranscript"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_extracted_event ON "ExtractedEvent"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_attachment ON "Attachment"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_audit_event ON "AuditEvent"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_user ON "User"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_patient_ref ON "PatientRef"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_coverage_ref ON "CoverageRef"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_order_ref ON "OrderRef"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_tenant_settings ON "TenantSettings"
  USING ("tenantId" = current_setting('app.current_tenant', true));
