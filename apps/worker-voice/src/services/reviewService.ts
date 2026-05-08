// Review service — forwards human reviewer decisions to the API for persistence and auto-apply.

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";
const INTERNAL_SECRET = process.env["INTERNAL_SECRET"] ?? "";

interface ReviewDecision {
  extractedEventId: string;
  caseId: string;
  tenantId: string;
  decision: "approved" | "rejected";
  reviewedBy: string;
}

export const reviewService = {
  async processReview(decision: ReviewDecision): Promise<void> {
    const res = await fetch(
      `${API_URL}/api/voice/webhooks/event-extraction/review`,
      {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-internal-secret": INTERNAL_SECRET,
          "x-tenant-id":       decision.tenantId,
        },
        body: JSON.stringify({
          extractedEventId: decision.extractedEventId,
          decision:         decision.decision,
          reviewedBy:       decision.reviewedBy,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        `Failed to submit review decision for event ${decision.extractedEventId}: ${res.status}`
      );
    }
  },
};
