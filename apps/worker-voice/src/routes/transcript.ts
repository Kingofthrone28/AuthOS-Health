import { Router } from "express";
import { z } from "zod";
import { extractionService } from "../services/extractionService.js";
import { ApiError } from "../middleware/errorHandler.js";

export const transcriptRouter = Router();

const TranscriptPayloadSchema = z.object({
  callSid: z.string(),
  tenantId: z.string(),
  caseId: z.string(),
  transcriptText: z.string(),
  durationSeconds: z.number().optional(),
  provider: z.string(),
  completedAt: z.string(),
});

// POST /voice/webhooks/transcript
// Received from telephony/transcription provider when a call transcript is ready.
transcriptRouter.post("/transcript", async (req, res, next) => {
  try {
    const parsed = TranscriptPayloadSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.message);

    const payload = parsed.data;

    // 1. Persist transcript to API (fire-and-forget to avoid blocking webhook response)
    // TODO: POST to apps/api /voice/webhooks/transcript

    // 2. Trigger extraction pipeline
    const events = await extractionService.extractEvents(payload.transcriptText, payload.caseId);

    // 3. Forward extraction results to API
    // TODO: POST to apps/api /voice/webhooks/event-extraction

    res.json({ received: true, eventsExtracted: events.length });
  } catch (err) {
    next(err);
  }
});
