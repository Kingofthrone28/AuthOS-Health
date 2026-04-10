// Review service — processes human reviewer decisions on extracted events.
// Approved high-confidence events may be auto-applied; irreversible actions always need review.

interface ReviewDecision {
  extractedEventId: string;
  caseId: string;
  tenantId: string;
  decision: "approved" | "rejected";
  reviewedBy: string;
}

export const reviewService = {
  async processReview(decision: ReviewDecision): Promise<void> {
    // TODO: update ExtractedEvent review status via API
    // TODO: if approved and auto-apply eligible, update case ref fields
    // TODO: emit audit event
    console.log(`Review decision for event ${decision.extractedEventId}: ${decision.decision}`);
  },
};
