import type { ExtractedEventType } from "@authos/shared-types";

// Webhook payloads received from telephony / transcription providers.
// worker-voice validates incoming webhooks against these shapes.

export interface TranscriptWebhookPayload {
  callSid: string;
  tenantId: string;
  caseId?: string | null;
  direction?: "inbound" | "outbound";
  transcriptText: string;
  durationSeconds?: number;
  provider: string; // e.g. "deepgram", "assemblyai"
  completedAt: string; // ISO timestamp
}

export interface ExtractionWebhookPayload {
  transcriptId: string;
  caseId: string;
  tenantId: string;
  events: RawExtractedEvent[];
}

export interface RawExtractedEvent {
  eventType: ExtractedEventType;
  value: string;
  confidence: number; // 0–1
}

// Adapter interface for telephony providers (Twilio, Vonage, etc.)
export interface TelephonyAdapter {
  initiateCall(params: InitiateCallParams): Promise<ActiveCall>;
  hangup(callSid: string): Promise<void>;
}

export interface InitiateCallParams {
  toNumber: string;
  fromNumber: string;
  caseId: string;
  tenantId: string;
  webhookUrl: string;
}

export interface ActiveCall {
  callSid: string;
  status: "initiated" | "ringing" | "in-progress";
}
