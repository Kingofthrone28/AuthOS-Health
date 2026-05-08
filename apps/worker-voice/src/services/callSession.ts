// CallSession — owns the STT connection and transcript state for a single phone call.
// Created when Twilio sends a "start" event; finalized on "stop" or unexpected close.

import type { SttClient } from "./sttClient.js";

export type SessionDoneCallback = (
  session: CallSession,
  transcriptText: string,
  durationMs: number
) => Promise<void>;

export class CallSession {
  private readonly finalSegments: string[] = [];
  private readonly startTime: Date;
  private finishing = false; // guard against double-finish on WS close + stop race

  constructor(
    readonly callSid:  string,
    readonly caseId:   string | null,
    readonly tenantId: string,
    private readonly stt:    SttClient,
    private readonly onDone: SessionDoneCallback
  ) {
    this.startTime = new Date();

    stt.onTranscript((text, _isFinal) => {
      if (text) this.finalSegments.push(text);
    });

    stt.onError((err) => {
      // Log but do not crash — partial transcript will still be assembled on finish
      console.error(`[${callSid}] STT error:`, err.message);
    });
  }

  /** Forward a raw base64-encoded µ-law audio chunk from Twilio. */
  handleAudio(base64Payload: string): void {
    const chunk = Buffer.from(base64Payload, "base64");
    this.stt.send(chunk);
  }

  /**
   * Signal end of call. Closes the STT connection, waits for all final segments,
   * then calls onDone with the assembled transcript.
   * Safe to call multiple times (subsequent calls are no-ops).
   */
  async finish(): Promise<void> {
    if (this.finishing) return;
    this.finishing = true;

    // close() waits for Deepgram to flush remaining audio and deliver final transcripts
    await this.stt.close();

    const transcriptText = this.finalSegments.join(" ").trim();
    const durationMs     = Date.now() - this.startTime.getTime();

    await this.onDone(this, transcriptText, durationMs);
  }
}
