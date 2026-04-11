"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api/client";
import { requireSession } from "@/lib/session";

export async function reviewExtractedEvent(
  extractedEventId: string,
  decision: "approved" | "rejected"
): Promise<void> {
  const session = await requireSession();

  await apiFetch("/api/voice/webhooks/event-extraction/review", {
    tenantId: session.tenantId,
    method:   "POST",
    body:     JSON.stringify({ extractedEventId, decision, reviewedBy: session.user.id }),
  });

  revalidatePath("/voice");
}
