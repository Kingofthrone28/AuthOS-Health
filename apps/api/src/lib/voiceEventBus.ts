import { EventEmitter } from "events";

export interface VoiceEvent {
  tenantId: string;
  type:
    | "call_started"
    | "transcript_live"
    | "transcript_completed"
    | "events_extracted"
    | "review_processed";
  callSid?: string;
  transcriptId?: string;
  caseId?: string | null;
  occurredAt: string;
}

const bus = new EventEmitter();
const EVENT_NAME = "voice-event";

export function publishVoiceEvent(event: Omit<VoiceEvent, "occurredAt">): void {
  bus.emit(EVENT_NAME, {
    ...event,
    occurredAt: new Date().toISOString(),
  } satisfies VoiceEvent);
}

export function subscribeToVoiceEvents(
  tenantId: string,
  listener: (event: VoiceEvent) => void
): () => void {
  const handler = (event: VoiceEvent) => {
    if (event.tenantId !== tenantId) return;
    listener(event);
  };

  bus.on(EVENT_NAME, handler);
  return () => {
    bus.off(EVENT_NAME, handler);
  };
}
