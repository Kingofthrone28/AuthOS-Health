// Shared pipeline: persist a completed transcript → run Claude extraction → persist events.
// Called by both the HTTP webhook route (transcript.ts) and the Twilio WebSocket handler.

import { extractionService } from "./extractionService.js";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export interface CompletedTranscriptPayload {
  callSid:          string;
  tenantId:         string;
  caseId?:          string | null | undefined;
  direction?:       "inbound" | "outbound" | undefined;
  transcriptText:   string;
  durationSeconds?: number | undefined;
  provider:         string;
  completedAt:      string; // ISO 8601
}

export interface PipelineResult {
  transcriptId:    string;
  eventsExtracted: number;
}

export async function processCompletedTranscript(
  payload: CompletedTranscriptPayload
): Promise<PipelineResult> {
  // 1. Persist the completed transcript; API returns a transcriptId
  const transcriptRes = await fetch(`${API_URL}/api/voice/webhooks/transcript`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id":  payload.tenantId,
    },
    body: JSON.stringify(payload),
  });

  if (!transcriptRes.ok) {
    throw new Error(
      `Failed to persist transcript for call ${payload.callSid}: ${transcriptRes.status}`
    );
  }

  const { transcriptId } = (await transcriptRes.json()) as { transcriptId: string };

  // 2. Run Claude extraction — empty transcript produces no events (short-circuits cleanly)
  if (!payload.transcriptText.trim()) {
    return { transcriptId, eventsExtracted: 0 };
  }

  if (!payload.caseId) {
    return { transcriptId, eventsExtracted: 0 };
  }

  const events = await extractionService.extractEvents(
    payload.transcriptText,
    payload.caseId
  );

  // 3. Persist extracted events; API handles confidence routing and review queue
  if (events.length > 0) {
    await fetch(`${API_URL}/api/voice/webhooks/event-extraction`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id":  payload.tenantId,
      },
      body: JSON.stringify({
        transcriptId,
        caseId:   payload.caseId,
        tenantId: payload.tenantId,
        events,
      }),
    });
  }

  return { transcriptId, eventsExtracted: events.length };
}
