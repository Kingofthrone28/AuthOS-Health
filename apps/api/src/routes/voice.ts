import { Router } from "express";
import { z } from "zod";
import { ctx } from "../lib/context.js";

export const voiceRouter = Router();

const TranscriptBodySchema = z.object({
  callSid:         z.string(),
  caseId:          z.string(),
  transcriptText:  z.string(),
  durationSeconds: z.number().optional(),
  provider:        z.string(),
  completedAt:     z.string(),
});

const ExtractionBodySchema = z.object({
  transcriptId: z.string(),
  caseId:       z.string(),
  events: z.array(
    z.object({
      eventType:  z.string(),
      value:      z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

const ReviewBodySchema = z.object({
  extractedEventId: z.string(),
  decision:         z.enum(["approved", "rejected"]),
  reviewedBy:       z.string(),
});

// ─── Read routes ──────────────────────────────────────────────────────────────

// GET /api/voice/stats
// KPI counts for the Voice dashboard: transcripts, events, pending review.
voiceRouter.get("/stats", async (_req, res, next) => {
  try {
    const { tenantId } = res.locals as { tenantId: string };
    const stats = await ctx.voiceService.getVoiceStats(tenantId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/voice/transcripts
// Recent call transcripts with per-transcript event summary.
voiceRouter.get("/transcripts", async (_req, res, next) => {
  try {
    const { tenantId } = res.locals as { tenantId: string };
    const transcripts = await ctx.voiceService.listTranscripts(tenantId);
    res.json(transcripts);
  } catch (err) {
    next(err);
  }
});

// GET /api/voice/events/pending
// Extracted events waiting for human review.
voiceRouter.get("/events/pending", async (_req, res, next) => {
  try {
    const { tenantId } = res.locals as { tenantId: string };
    const events = await ctx.voiceService.listPendingEvents(tenantId);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// ─── Webhook write routes ─────────────────────────────────────────────────────

// POST /api/voice/webhooks/transcript
// Persists a completed call transcript received from worker-voice.
voiceRouter.post("/webhooks/transcript", async (req, res, next) => {
  try {
    const parsed = TranscriptBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { tenantId } = res.locals as { tenantId: string };
    const transcript = await ctx.voiceService.persistTranscript(tenantId, {
      ...parsed.data,
      tenantId,
    });

    res.json({ transcriptId: transcript.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/voice/webhooks/event-extraction
// Persists extracted events from worker-voice, routes low-confidence to review queue.
voiceRouter.post("/webhooks/event-extraction", async (req, res, next) => {
  try {
    const parsed = ExtractionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { tenantId } = res.locals as { tenantId: string };
    const result = await ctx.voiceService.persistExtractedEvents(
      tenantId,
      parsed.data.transcriptId,
      parsed.data.caseId,
      parsed.data.events as never
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/voice/webhooks/event-extraction/review
// Human reviewer approves or rejects an extracted event from the dashboard.
voiceRouter.post("/webhooks/event-extraction/review", async (req, res, next) => {
  try {
    const parsed = ReviewBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { tenantId } = res.locals as { tenantId: string };
    await ctx.voiceService.processReview(
      tenantId,
      parsed.data.extractedEventId,
      parsed.data.decision,
      parsed.data.reviewedBy
    );

    res.json({ processed: true });
  } catch (err) {
    next(err);
  }
});
