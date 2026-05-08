// STT client abstraction — decouples the Twilio handler from the speech-to-text provider.
//
// First implementation: Deepgram live transcription via its WebSocket API.
// Using ws directly rather than the Deepgram SDK to avoid SDK version fragility —
// the WebSocket protocol is stable and well-documented.
//
// Deepgram API: wss://api.deepgram.com/v1/listen
// Twilio audio: 8 kHz mono µ-law — Deepgram accepts this natively.
//
// Swap createDeepgramLiveClient() for a different provider without touching CallSession.

import WebSocket from "ws";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface SttClient {
  /** Forward a raw audio chunk. Called once per Twilio media frame. */
  send(chunk: Buffer): void;
  /**
   * Signal end of audio. Returns a Promise that resolves when the connection
   * has fully closed and all in-flight transcripts have been delivered.
   */
  close(): Promise<void>;
  onTranscript(handler: (text: string, isFinal: boolean) => void): void;
  onError(handler: (err: Error) => void): void;
}

// ─── Deepgram response shape (subset) ────────────────────────────────────────

interface DeepgramTranscriptMsg {
  type:          "Results";
  is_final:      boolean;
  speech_final?: boolean;
  channel: {
    alternatives: Array<{ transcript: string; confidence: number }>;
  };
}

// ─── Deepgram WebSocket implementation ───────────────────────────────────────

const DEEPGRAM_URL = "wss://api.deepgram.com/v1/listen";

/**
 * Creates a Deepgram live-transcription client.
 * Audio sent before the WebSocket opens is buffered and drained on open.
 */
export function createDeepgramLiveClient(apiKey: string): SttClient {
  const params = new URLSearchParams({
    model:            "nova-2",
    encoding:         "mulaw",
    sample_rate:      "8000",
    channels:         "1",
    punctuate:        "true",
    interim_results:  "false", // only final results for clean assembly
    utterance_end_ms: "1000",
  });

  const ws = new WebSocket(`${DEEPGRAM_URL}?${params}`, {
    headers: { Authorization: `Token ${apiKey}` },
  });

  let transcriptHandler: ((text: string, isFinal: boolean) => void) | null = null;
  let errorHandler:      ((err: Error) => void)                            | null = null;
  let closeResolve:      (() => void)                                      | null = null;
  const audioQueue:      Buffer[]                                                 = [];
  let   open = false;

  ws.on("open", () => {
    open = true;
    // Drain any audio buffered before the connection was ready
    audioQueue.splice(0).forEach((chunk) => ws.send(chunk));
  });

  ws.on("message", (raw: Buffer | string) => {
    let msg: { type?: string };
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
    } catch {
      return;
    }

    if (msg.type !== "Results") return;

    const r     = msg as DeepgramTranscriptMsg;
    const text  = r.channel?.alternatives?.[0]?.transcript ?? "";
    const final = r.is_final ?? false;

    if (text.trim() && transcriptHandler) {
      transcriptHandler(text.trim(), final);
    }
  });

  ws.on("close", () => {
    closeResolve?.();
  });

  ws.on("error", (err) => {
    errorHandler?.(err instanceof Error ? err : new Error(String(err)));
  });

  return {
    send(chunk: Buffer) {
      if (open && ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      } else {
        audioQueue.push(chunk);
      }
    },

    close(): Promise<void> {
      return new Promise((resolve) => {
        closeResolve = resolve;
        // Fallback: resolve after 5 s if the close event never fires
        const timeout = setTimeout(resolve, 5_000);

        ws.once("close", () => clearTimeout(timeout));

        if (ws.readyState === WebSocket.OPEN) {
          // Tell Deepgram to finalize remaining audio before closing
          ws.send(JSON.stringify({ type: "CloseStream" }));
        } else {
          ws.terminate();
        }
      });
    },

    onTranscript(handler) { transcriptHandler = handler; },
    onError(handler)      { errorHandler      = handler; },
  };
}

// ─── No-op implementation (dev / missing API key) ────────────────────────────

export function createNoopSttClient(): SttClient {
  return {
    send()         { /* drop audio */ },
    close()        { return Promise.resolve(); },
    onTranscript() { /* no-op */ },
    onError()      { /* no-op */ },
  };
}

// ─── Factory (reads env at call time) ────────────────────────────────────────

export function createSttClient(): SttClient {
  const apiKey = process.env["STT_API_KEY"] ?? "";
  if (!apiKey) {
    console.warn("[sttClient] STT_API_KEY not set — using no-op STT client (no transcription)");
    return createNoopSttClient();
  }
  return createDeepgramLiveClient(apiKey);
}
