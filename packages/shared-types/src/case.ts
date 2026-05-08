// AuthorizationCase — the central workflow entity

export type AuthorizationCaseStatus =
  | "new"
  | "requirements_found"
  | "docs_missing"
  | "ready_to_submit"
  | "submitted"
  | "pending_payer"
  | "more_info_requested"
  | "peer_review_needed"
  | "approved"
  | "denied"
  | "appealed"
  | "closed";

export type CasePriority = "standard" | "expedited" | "urgent";

export interface AuthorizationCase {
  id: string;
  tenantId: string;
  patientRefId: string;
  coverageRefId: string;
  orderRefId?: string;
  encounterRefId?: string;
  serviceType: string;
  serviceCode?: string;
  priority: CasePriority;
  status: AuthorizationCaseStatus;
  payerName: string;
  payerCaseRef?: string;   // payer-assigned reference number
  approvalNumber?: string; // voice-extracted payer approval number
  dueAt?: Date;
  createdBy: string; // userId
  assignedTo?: string; // userId
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthorizationRequirement {
  id: string;
  caseId: string;
  tenantId: string;
  description: string;
  required: boolean;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  source: "crd" | "dtr" | "manual";
}

export interface Submission {
  id: string;
  caseId: string;
  tenantId: string;
  protocol: "pas" | "fhir" | "x12" | "portal";
  payloadRef?: string; // blob storage reference
  submittedAt: Date;
  submittedBy: string;
}

export interface PayerResponse {
  id: string;
  submissionId: string;
  caseId: string;
  tenantId: string;
  decision: "approved" | "denied" | "more_info" | "peer_review" | "pending";
  denialReason?: string;
  denialCode?: string;
  authNumber?: string;
  rawResponseRef?: string;
  receivedAt: Date;
}

export interface Task {
  id: string;
  caseId: string;
  tenantId: string;
  type: string;
  description: string;
  assignedTo?: string;
  completedAt?: Date;
  dueAt?: Date;
  createdAt: Date;
}
