import type { ExtractedEvent } from "@authos/shared-types";

// Confidence threshold below which a voice extraction must go to human review.
export const HUMAN_REVIEW_THRESHOLD = 0.75;

export function requiresHumanReview(event: Pick<ExtractedEvent, "confidence">): boolean {
  return event.confidence < HUMAN_REVIEW_THRESHOLD;
}

// Approved AI extractions that are safe to auto-apply to the case (read-only fact updates).
// Irreversible mutations (status changes, submissions) always require human review.
export const AUTO_APPLY_EVENT_TYPES = new Set([
  "reference_number",
  "approval_number",
  "callback_deadline",
] as const);
