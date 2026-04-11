"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api/client";

export async function reviewExtractedEvent(
  extractedEventId: string,
  decision: "approved" | "rejected"
): Promise<void> {
  await apiFetch("/api/voice/webhooks/event-extraction/review", {
    tenantId: "default",
    method:   "POST",
    body:     JSON.stringify({ extractedEventId, decision, reviewedBy: "dashboard-user" }),
  });

  revalidatePath("/voice");
}
