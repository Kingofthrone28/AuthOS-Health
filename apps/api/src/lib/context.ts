import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma.js";
import { CaseService } from "../services/caseService.js";
import { RequirementsService } from "../services/requirementsService.js";
import { AttachmentService } from "../services/attachmentService.js";
import { AuditService } from "../services/auditService.js";

export interface AppContext {
  caseService: CaseService;
  requirementsService: RequirementsService;
  attachmentService: AttachmentService;
  auditService: AuditService;
}

export function buildContext(db: PrismaClient = defaultPrisma): AppContext {
  const auditService = new AuditService(db);
  return {
    auditService,
    caseService: new CaseService(db, auditService),
    requirementsService: new RequirementsService(db, auditService),
    attachmentService: new AttachmentService(db, auditService),
  };
}

// Singleton context for production use — one set of services per process.
export const ctx = buildContext();
