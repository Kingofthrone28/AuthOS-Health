import { Router } from "express";

export const voiceRouter = Router();

// POST /api/cases/:id/calls/start  (mounted under /api/cases)
// POST /api/voice/webhooks/transcript
voiceRouter.post("/webhooks/transcript", async (req, res, next) => {
  try {
    // Received from worker-voice after transcription completes
    // TODO: persist CallTranscript record
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/voice/webhooks/event-extraction
voiceRouter.post("/webhooks/event-extraction", async (req, res, next) => {
  try {
    // Received from worker-voice after AI extraction completes
    // TODO: persist ExtractedEvent records, route low-confidence to review queue
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
