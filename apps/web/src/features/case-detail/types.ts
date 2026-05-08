import type { AuthorizationCaseStatus, CasePriority, ExtractedEventType } from "@authos/shared-types";

export interface CaseDetailViewModel {
  id: string;
  status: AuthorizationCaseStatus;
  priority: CasePriority;
  patientName: string;
  patientDob?: string | undefined;
  patientGender?: string | undefined;
  patientMrn?: string | undefined;
  payerName: string;
  payerCaseRef?: string | undefined;
  coveragePlanName?: string | undefined;
  coverageMemberId?: string | undefined;
  coverageGroupId?: string | undefined;
  serviceType: string;
  assignedTo?: string | undefined;
  dueAt?: string | undefined;
  isNearingBreach: boolean;
  authNumber?: string | undefined;
  denialReason?: string | undefined;
  denialCode?: string | undefined;
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
  decision?: string | undefined;
  denialReason?: string | undefined;
}

export interface AttachmentViewModel {
  id: string;
  fileName: string;
  classification?: string | undefined;
  uploadedAt: string;
}

export interface TaskViewModel {
  id: string;
  type: string;
  description: string;
  assignedTo?: string | undefined;
  dueAt?: string | undefined;
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
  actorId?: string | undefined;
  occurredAt: string;
}
