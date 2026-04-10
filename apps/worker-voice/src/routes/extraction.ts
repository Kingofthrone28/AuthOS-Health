import { Router } from "express";
import { z } from "zod";
import { reviewService } from "../services/reviewService.js";
import { ApiError } from "../middleware/errorHandler.js";

export const extractionRouter = Router();

const ReviewSchema = z.object({
  extractedEventId: z.string(),
  caseId: z.string(),
  tenantId: z.string(),
  decision: z.enum(["approved", "rejected"]),
  reviewedBy: z.string(),
});

// POST /voice/webhooks/event-extraction/review
// Human reviewer approves or rejects an extracted event from the dashboard.
extractionRouter.post("/event-extraction/review", async (req, res, next) => {
  try {
    const parsed = ReviewSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.message);

    await reviewService.processReview(parsed.data);

    res.json({ processed: true });
  } catch (err) {
    next(err);
  }
});
