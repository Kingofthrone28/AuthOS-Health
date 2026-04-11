import { Router } from "express";
import { z } from "zod";
import { extractionService } from "../services/extractionService.js";
import { ApiError } from "../middleware/errorHandler.js";

export const transcriptRouter = Router();

const TranscriptPayloadSchema = z.object({
  callSid:         z.string(),
  tenantId:        z.string(),
  caseId:          z.string(),
  transcriptText:  z.string(),
  durationSeconds: z.number().optional(),
  provider:        z.string(),
  completedAt:     z.string(),
});

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

// POST /voice/webhooks/transcript
// Received from telephony/transcription provider when a call transcript is ready.
transcriptRouter.post("/transcript", async (req, res, next) => {
  try {
    const parsed = TranscriptPayloadSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.message);

    const payload = parsed.data;

    // 1. Persist transcript to API → get transcriptId
    const transcriptRes = await fetch(`${API_URL}/api/voice/webhooks/transcript`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id":  payload.tenantId,
      },
      body: JSON.stringify(payload),
    });

    if (!transcriptRes.ok) {
      throw new ApiError(502, `Failed to persist transcript: ${transcriptRes.status}`);
    }

    const { transcriptId } = await transcriptRes.json() as { transcriptId: string };

    // 2. Run Claude extraction pipeline
    const events = await extractionService.extractEvents(payload.transcriptText, payload.caseId);

    // 3. Forward extraction results to API for persistence and review routing
    if (events.length > 0) {
      await fetch(`${API_URL}/api/voice/webhooks/event-extraction`, {
        method: "POST",
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

    res.json({ received: true, eventsExtracted: events.length });
  } catch (err) {
    next(err);
  }
});
