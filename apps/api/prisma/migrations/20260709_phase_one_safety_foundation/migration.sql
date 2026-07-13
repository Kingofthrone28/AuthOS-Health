-- Phase 1 production safety foundation: optimistic locks and enforced tenant RLS.

ALTER TABLE "AuthorizationCase"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Submission"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AuthorizationCase"
  ADD COLUMN IF NOT EXISTS "slaWarningAt" TIMESTAMP(3);

ALTER TABLE "Attachment"
  ADD COLUMN IF NOT EXISTS "encrypted" BOOLEAN NOT NULL DEFAULT false;

-- FORCE makes policies apply to the table owner as well as ordinary app roles.
-- Every application transaction must set app.current_tenant with SET LOCAL.
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
ALTER TABLE "PatientRef" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CoverageRef" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrderRef" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantSettings" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_authorization_case ON "AuthorizationCase";
CREATE POLICY tenant_isolation_authorization_case ON "AuthorizationCase"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_authorization_requirement ON "AuthorizationRequirement";
CREATE POLICY tenant_isolation_authorization_requirement ON "AuthorizationRequirement"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_submission ON "Submission";
CREATE POLICY tenant_isolation_submission ON "Submission"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_payer_response ON "PayerResponse";
CREATE POLICY tenant_isolation_payer_response ON "PayerResponse"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_task ON "Task";
CREATE POLICY tenant_isolation_task ON "Task"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_call_transcript ON "CallTranscript";
CREATE POLICY tenant_isolation_call_transcript ON "CallTranscript"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_extracted_event ON "ExtractedEvent";
CREATE POLICY tenant_isolation_extracted_event ON "ExtractedEvent"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_attachment ON "Attachment";
CREATE POLICY tenant_isolation_attachment ON "Attachment"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_audit_event ON "AuditEvent";
CREATE POLICY tenant_isolation_audit_event ON "AuditEvent"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_user ON "User";
CREATE POLICY tenant_isolation_user ON "User"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_patient_ref ON "PatientRef";
CREATE POLICY tenant_isolation_patient_ref ON "PatientRef"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_coverage_ref ON "CoverageRef";
CREATE POLICY tenant_isolation_coverage_ref ON "CoverageRef"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_order_ref ON "OrderRef";
CREATE POLICY tenant_isolation_order_ref ON "OrderRef"
  USING ("tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation_tenant_settings ON "TenantSettings";
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

DROP TRIGGER IF EXISTS audit_event_immutable ON "AuditEvent";
CREATE TRIGGER audit_event_immutable
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
