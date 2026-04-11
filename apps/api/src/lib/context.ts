import { getPrismaClient } from "./prisma.js";
import { CaseService } from "../services/caseService.js";
import { RequirementsService } from "../services/requirementsService.js";
import { AttachmentService } from "../services/attachmentService.js";
import { AuditService } from "../services/auditService.js";
import { VoiceService } from "../services/voiceService.js";
import { EhrService } from "../services/ehrService.js";
import { SubmissionService } from "../services/submissionService.js";
import { TaskService } from "../services/taskService.js";
import { AnalyticsService } from "../services/analyticsService.js";
import type { PrismaClient } from "@prisma/client";

export interface AppContext {
  caseService:         CaseService;
  requirementsService: RequirementsService;
  attachmentService:   AttachmentService;
  auditService:        AuditService;
  voiceService:        VoiceService;
  ehrService:          EhrService;
  submissionService:   SubmissionService;
  taskService:         TaskService;
  analyticsService:    AnalyticsService;
}

export function buildContext(db: PrismaClient = getPrismaClient()): AppContext {
  const auditService = new AuditService(db);
  return {
    auditService,
    caseService:         new CaseService(db, auditService),
    requirementsService: new RequirementsService(db, auditService),
    attachmentService:   new AttachmentService(db, auditService),
    voiceService:        new VoiceService(db, auditService),
    ehrService:          new EhrService(db),
    submissionService:   new SubmissionService(db, auditService),
    taskService:         new TaskService(db, auditService),
    analyticsService:    new AnalyticsService(db),
  };
}

// ctx is a lazy getter — buildContext() (and therefore getPrismaClient()) is
// called on first property access, not at module import time.
let _ctx: AppContext | undefined;
export const ctx: AppContext = new Proxy({} as AppContext, {
  get(_target, prop) {
    if (!_ctx) _ctx = buildContext();
    return (_ctx as unknown as Record<string | symbol, unknown>)[prop];
  },
});
