import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../middleware/errorHandler.js";
import { processCompletedTranscript } from "../services/transcriptPipeline.js";

export const transcriptRouter = Router();

const TranscriptPayloadSchema = z.object({
  callSid:         z.string(),
  tenantId:        z.string(),
  caseId:          z.string().nullable().optional(),
  direction:       z.enum(["inbound", "outbound"]).optional(),
  transcriptText:  z.string(),
  durationSeconds: z.number().optional(),
  provider:        z.string(),
  completedAt:     z.string(),
});

// POST /voice/webhooks/transcript
// Received from a telephony/transcription provider when a call transcript is ready.
// Also used programmatically by the Twilio WebSocket handler after call completion.
transcriptRouter.post("/transcript", async (req, res, next) => {
  try {
    const parsed = TranscriptPayloadSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.message);

    const { eventsExtracted } = await processCompletedTranscript(parsed.data);

    res.json({ received: true, eventsExtracted });
  } catch (err) {
    next(err);
  }
});
