import type { TranscriptListItem, PendingEventItem, VoiceStats } from "@/lib/voice/queries";
import type { TranscriptRowViewModel, PendingEventViewModel, VoicePageViewModel } from "./types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function mapTranscriptToViewModel(t: TranscriptListItem): TranscriptRowViewModel {
  const pendingReviewCount = t.extractedEvents.filter((e) => e.reviewStatus === "pending").length;
  return {
    id:                 t.id,
    caseId:             t.caseId,
    callSid:            t.callSid,
    startedAt:          formatDate(t.startedAt),
    duration:           formatDuration(t.durationSeconds),
    eventCount:         t.extractedEvents.length,
    pendingReviewCount,
    hasText:            !!t.transcriptText,
  };
}

export function mapPendingEventToViewModel(e: PendingEventItem): PendingEventViewModel {
  return {
    id:            e.id,
    transcriptId:  e.transcriptId,
    caseId:        e.caseId,
    eventType:     e.eventType,
    value:         e.value,
    confidence:    e.confidence,
    confidencePct: `${Math.round(e.confidence * 100)}%`,
    extractedAt:   formatDate(e.extractedAt),
  };
}

export function buildVoicePageViewModel(
  stats: VoiceStats,
  transcripts: TranscriptListItem[],
  pendingEvents: PendingEventItem[]
): VoicePageViewModel {
  return {
    stats,
    transcripts:   transcripts.map(mapTranscriptToViewModel),
    pendingEvents: pendingEvents.map(mapPendingEventToViewModel),
  };
}
