import type { RawExtractedEvent } from "@authos/voice-adapters";
import type { VoiceService } from "./voiceService.js";

const DEFAULT_DELAY_MS = 3_000;

export interface StartMockPayerCallInput {
  tenantId: string;
  caseId: string;
  payerName: string;
  notes?: string | undefined;
  actorId?: string | undefined;
}

export interface MockPayerCallResult {
  callSid: string;
  transcriptId: string;
  status: "IN_PROGRESS";
}

export async function startMockPayerCall(
  voiceService: VoiceService,
  input: StartMockPayerCallInput
): Promise<MockPayerCallResult> {
  const callSid = buildMockCallSid();
  const startedAt = new Date();

  const transcript = await voiceService.startCallTranscript(input.tenantId, {
    caseId: input.caseId,
    callSid,
    direction: "outbound",
    startedAt,
    ...(input.actorId ? { actorId: input.actorId } : {}),
  });

  const timer = setTimeout(() => {
    void completeMockPayerCall(voiceService, input, callSid, startedAt).catch((err) => {
      console.error(`[${callSid}] mock payer call completion failed:`, err);
    });
  }, getMockDelayMs());
  timer.unref?.();

  return {
    callSid,
    transcriptId: transcript.id,
    status: "IN_PROGRESS",
  };
}

async function completeMockPayerCall(
  voiceService: VoiceService,
  input: StartMockPayerCallInput,
  callSid: string,
  startedAt: Date
): Promise<void> {
  const completedAt = new Date(startedAt.getTime() + getMockDelayMs());
  const transcriptText = buildMockTranscript(input, callSid);

  const transcript = await voiceService.persistTranscript(input.tenantId, {
    tenantId:        input.tenantId,
    caseId:          input.caseId,
    callSid,
    direction:       "outbound",
    transcriptText,
    durationSeconds: Math.max(45, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)),
    provider:        "mock-voice-service",
    completedAt:     completedAt.toISOString(),
  });

  const events = buildMockEvents(callSid);
  if (events.length === 0) return;

  await voiceService.persistExtractedEvents(
    input.tenantId,
    transcript.id,
    input.caseId,
    events
  );
}

function buildMockCallSid(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MOCK-${Date.now()}-${suffix}`;
}

function buildMockTranscript(input: StartMockPayerCallInput, callSid: string): string {
  const shortCaseId = input.caseId.slice(-6).toUpperCase();
  const referenceNumber = buildReferenceNumber(callSid);
  const callbackDate = buildCallbackDate();
  const noteLines = normalizeNotes(input.notes);

  const transcriptLines = [
    `Caller: Hello, this is the prior authorization team following up on case ${shortCaseId}.`,
    `Payer (${input.payerName}): I found the request and created reference number ${referenceNumber}.`,
    "Payer: The authorization is still pending clinical review at this time.",
    "Payer: Please add the latest office notes and the most recent imaging report to avoid delays.",
    `Payer: If you need another update, please call us back by ${callbackDate}.`,
  ];

  if (noteLines.length > 0) {
    transcriptLines.push("Payer: Additional simulation notes follow.");
    transcriptLines.push(...noteLines.map((line) => `Payer: ${line}`));
  }

  return transcriptLines.join("\n");
}

function buildMockEvents(callSid: string): RawExtractedEvent[] {
  return [
    {
      eventType:  "reference_number",
      value:      buildReferenceNumber(callSid),
      confidence: 0.98,
    },
    {
      eventType:  "missing_document",
      value:      "latest office notes and most recent imaging report",
      confidence: 0.93,
    },
    {
      eventType:  "callback_deadline",
      value:      buildCallbackDate(),
      confidence: 0.86,
    },
  ];
}

function buildReferenceNumber(callSid: string): string {
  return `REF-${callSid.slice(-6)}`;
}

function buildCallbackDate(): string {
  return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function getMockDelayMs(): number {
  const raw = Number.parseInt(process.env["MOCK_VOICE_CALL_DELAY_MS"] ?? "", 10);
  if (Number.isNaN(raw) || raw < 0) return DEFAULT_DELAY_MS;
  return raw;
}

function normalizeNotes(notes?: string): string[] {
  if (!notes) return [];

  return notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
