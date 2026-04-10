import type { AuthorizationCaseStatus, CasePriority, ExtractedEventType } from "@authos/shared-types";

export interface CaseDetailViewModel {
  id: string;
  status: AuthorizationCaseStatus;
  priority: CasePriority;
  patientName: string;
  payerName: string;
  payerCaseRef?: string;
  serviceType: string;
  assignedTo?: string;
  dueAt?: string;
  isNearingBreach: boolean;
  requirements: RequirementViewModel[];
  submissions: SubmissionViewModel[];
  attachments: AttachmentViewModel[];
  extractedEvents: ExtractedEventViewModel[];
  auditTimeline: AuditTimelineEntry[];
}

export interface RequirementViewModel {
  id: string;
  description: string;
  required: boolean;
  completed: boolean;
}

export interface SubmissionViewModel {
  id: string;
  protocol: string;
  submittedAt: string;
  decision?: string;
  denialReason?: string;
}

export interface AttachmentViewModel {
  id: string;
  fileName: string;
  classification?: string;
  uploadedAt: string;
}

export interface ExtractedEventViewModel {
  id: string;
  eventType: ExtractedEventType;
  value: string;
  confidence: number;
  reviewStatus: "pending" | "approved" | "rejected";
}

export interface AuditTimelineEntry {
  id: string;
  action: string;
  actorId?: string;
  occurredAt: string;
}
