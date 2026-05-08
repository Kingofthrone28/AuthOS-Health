// Twilio Media Streams WebSocket handler.
// Twilio connects here when a call with <Start><Stream> TwiML is active.
// Lifecycle: connected → start → media (many) → stop
//
// Audio format: base64-encoded 8 kHz mono µ-law (PCMU).
// Deepgram accepts this natively — no transcoding needed.
//
// Each call gets its own CallSession. Sessions are keyed by streamSid so that
// reconnects or duplicate "start" messages are handled idempotently.

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { URL } from "url";
import { CallSession } from "../services/callSession.js";
import { createSttClient } from "../services/sttClient.js";
import { processCompletedTranscript } from "../services/transcriptPipeline.js";

// ─── Twilio message shapes ────────────────────────────────────────────────────

type TwilioMsg =
  | { event: "connected"; protocol: string; version: string }
  | {
      event: "start";
      streamSid: string;
      start: {
        callSid:          string;
        streamSid:        string;
        accountSid:       string;
        tracks:           string[];
        customParameters: Record<string, string>;
      };
    }
  | { event: "media"; streamSid: string; media: { track: string; chunk: string; timestamp: string; payload: string } }
  | { event: "stop"; streamSid: string; stop: { accountSid: string; callSid: string } };

// ─── WebSocket server ─────────────────────────────────────────────────────────

export const twilioMediaWss = new WebSocketServer({ noServer: true });

// Active sessions keyed by streamSid
const activeSessions = new Map<string, CallSession>();

twilioMediaWss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  // tenantId and optional caseId come from the stream URL set in TwiML.
  const url      = new URL(req.url ?? "/", "ws://localhost");
  const caseId   = url.searchParams.get("caseId");
  const tenantId = url.searchParams.get("tenantId") ?? "";
  const direction = url.searchParams.get("direction") === "outbound" ? "outbound" : "inbound";

  if (!tenantId) {
    ws.close(1008, "tenantId query param is required");
    return;
  }

  // Track the current session for this connection (set on "start", cleared on "stop")
  let session: CallSession | null = null;

  ws.on("message", (raw: Buffer) => {
    let msg: TwilioMsg;
    try {
      msg = JSON.parse(raw.toString()) as TwilioMsg;
    } catch {
      return; // ignore malformed frames
    }

    switch (msg.event) {
      case "connected":
        // Protocol handshake — Twilio confirms WebSocket is ready. Nothing to do.
        break;

      case "start": {
        const { callSid, streamSid } = msg.start;

        // Idempotent: Twilio may re-send "start" on reconnect
        if (activeSessions.has(streamSid)) {
          session = activeSessions.get(streamSid)!;
          break;
        }

        session = new CallSession(
          callSid,
          caseId,
          tenantId,
          createSttClient(),
          async (s, transcriptText, durationMs) => {
            try {
              const result = await processCompletedTranscript({
                callSid:         s.callSid,
                tenantId:        s.tenantId,
                caseId:          s.caseId,
                direction,
                transcriptText,
                durationSeconds: Math.round(durationMs / 1000),
                provider:        "twilio+deepgram",
                completedAt:     new Date().toISOString(),
              });
              console.log(
                `[${s.callSid}] pipeline complete — transcriptId=${result.transcriptId}` +
                ` eventsExtracted=${result.eventsExtracted}`
              );
            } catch (err) {
              // Log but do not throw — the transcript buffer is not lost; caller can reprocess
              console.error(`[${s.callSid}] pipeline error:`, err);
            }
          }
        );

        activeSessions.set(streamSid, session);
        console.log(`[${callSid}] Stream started — case=${caseId ?? "unlinked"} tenant=${tenantId}`);
        break;
      }

      case "media":
        session?.handleAudio(msg.media.payload);
        break;

      case "stop":
        if (session) {
          const { callSid } = msg.stop;
          console.log(`[${callSid}] Stream stopped — assembling transcript`);
          session.finish().catch((err) =>
            console.error(`[${callSid}] finish error:`, err)
          );
          activeSessions.delete(msg.streamSid);
          session = null;
        }
        break;
    }
  });

  ws.on("close", () => {
    // Twilio dropped the WebSocket without sending "stop" (e.g. network interruption).
    // Call finish() so the partial transcript is not lost. The finishing guard on
    // CallSession makes this a no-op if "stop" already fired first.
    if (session) {
      console.warn(`[${session.callSid}] WS closed without stop — finishing partial session`);
      session.finish().catch((err) =>
        console.error(`[${session!.callSid}] finish-on-close error:`, err)
      );
    }
  });

  ws.on("error", (err) => {
    console.error("[twilioMedia] WebSocket error:", err.message);
  });
});
