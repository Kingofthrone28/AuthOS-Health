export interface TranscriptRowViewModel {
  id:                 string;
  caseId:             string;
  callSid:            string;
  startedAt:          string; // formatted e.g. "Apr 10, 2:34 PM"
  duration:           string; // formatted e.g. "3m 12s" or "—"
  eventCount:         number;
  pendingReviewCount: number;
  hasText:            boolean;
}

export interface PendingEventViewModel {
  id:           string;
  transcriptId: string;
  caseId:       string;
  eventType:    string;
  value:        string;
  confidence:   number;        // 0–1
  confidencePct: string;       // formatted e.g. "68%"
  extractedAt:  string;
}

export interface VoicePageViewModel {
  stats:         { transcriptCount: number; eventCount: number; pendingCount: number };
  transcripts:   TranscriptRowViewModel[];
  pendingEvents: PendingEventViewModel[];
}
