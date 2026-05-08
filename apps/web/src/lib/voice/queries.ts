import { apiFetch } from "@/lib/api/client";

export interface VoiceStats {
  transcriptCount: number;
  eventCount:      number;
  pendingCount:    number;
}

export interface TranscriptListItem {
  id:              string;
  caseId:          string | null;
  callSid:         string;
  direction:       string;
  status:          "IN_PROGRESS" | "COMPLETED";
  startedAt:       string;
  endedAt:         string | null;
  durationSeconds: number | null;
  transcriptText:  string | null;
  extractedEvents: Array<{ id: string; reviewStatus: string }>;
}

export interface PendingEventItem {
  id:           string;
  transcriptId: string;
  caseId:       string;
  eventType:    string;
  value:        string;
  confidence:   number;
  reviewStatus: string;
  extractedAt:  string;
}

export async function fetchVoiceStats(tenantId: string): Promise<VoiceStats> {
  return apiFetch<VoiceStats>("/api/voice/stats", { tenantId });
}

export async function fetchTranscripts(tenantId: string): Promise<TranscriptListItem[]> {
  return apiFetch<TranscriptListItem[]>("/api/voice/transcripts", { tenantId });
}

export async function fetchPendingEvents(tenantId: string): Promise<PendingEventItem[]> {
  return apiFetch<PendingEventItem[]>("/api/voice/events/pending", { tenantId });
}
