// Voice AI entities

export interface CallTranscript {
  id: string;
  caseId: string;
  tenantId: string;
  callSid: string;
  direction: "outbound" | "inbound";
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  transcriptText?: string;
  transcriptRef?: string; // blob storage reference
}

export interface ExtractedEvent {
  id: string;
  transcriptId: string;
  caseId: string;
  tenantId: string;
  eventType: ExtractedEventType;
  value: string;
  confidence: number; // 0–1
  reviewStatus: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: Date;
  extractedAt: Date;
}

export type ExtractedEventType =
  | "reference_number"
  | "auth_status"
  | "missing_document"
  | "denial_reason"
  | "peer_review_required"
  | "callback_deadline"
  | "approval_number"
  | "other";
