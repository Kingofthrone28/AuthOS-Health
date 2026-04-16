import type { AuthorizationCaseStatus, CasePriority, ExtractedEventType } from "@authos/shared-types";

export interface CaseDetailViewModel {
  id: string;
  status: AuthorizationCaseStatus;
  priority: CasePriority;
  patientName: string;
  patientDob?: string;
  patientGender?: string;
  patientMrn?: string;
  payerName: string;
  payerCaseRef?: string;
  coveragePlanName?: string;
  coverageMemberId?: string;
  coverageGroupId?: string;
  serviceType: string;
  assignedTo?: string;
  dueAt?: string;
  isNearingBreach: boolean;
  authNumber?: string;
  denialReason?: string;
  denialCode?: string;
  requirements: RequirementViewModel[];
  submissions: SubmissionViewModel[];
  attachments: AttachmentViewModel[];
  tasks: TaskViewModel[];
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

export interface TaskViewModel {
  id: string;
  type: string;
  description: string;
  assignedTo?: string;
  dueAt?: string;
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
