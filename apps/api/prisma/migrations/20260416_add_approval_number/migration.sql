-- Phase 2 Voice: add approvalNumber to AuthorizationCase for auto-apply from voice extractions
ALTER TABLE "AuthorizationCase" ADD COLUMN "approvalNumber" TEXT;
