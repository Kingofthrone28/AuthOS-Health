// Normalized payer submission and response contracts.
// Each payer protocol (PAS, X12, FHIR) maps to/from these types.

export type SubmissionProtocol = "pas" | "fhir" | "x12" | "portal";

export interface SubmissionPacket {
  protocol: SubmissionProtocol;
  tenantId: string;
  caseId: string;
  patientMemberId: string;
  payerId: string;
  serviceCode: string;
  serviceType: string;
  priority: "standard" | "expedited" | "urgent";
  diagnosisCodes: string[];
  attachmentRefs: string[];
  narrativeSummary?: string;
}

export interface PayerDecisionResponse {
  protocol: SubmissionProtocol;
  rawPayload: unknown;
  decision: "approved" | "denied" | "more_info" | "peer_review" | "pending";
  authNumber?: string;
  denialReason?: string;
  denialCode?: string;
}

// Adapter interface — one implementation per protocol.
export interface PayerAdapter {
  protocol: SubmissionProtocol;
  submit(packet: SubmissionPacket): Promise<PayerDecisionResponse>;
}
