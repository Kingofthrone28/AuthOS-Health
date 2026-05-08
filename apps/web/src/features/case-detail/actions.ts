"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api/client";
import { requireSession } from "@/lib/session";

export interface ActiveCallViewModel {
  callSid: string;
  startedAt: string;
}

interface ActiveCallApiResponse {
  activeCall: {
    callSid: string;
    startedAt: string;
  } | null;
}

export async function startPayerCall(
  caseId: string,
  toNumber?: string
): Promise<{ callSid: string }> {
  const session = await requireSession();

  const body = toNumber ? { toNumber } : {};
  const result = await apiFetch<{ callSid: string }>(`/api/cases/${caseId}/calls/start`, {
    tenantId:    session.tenantId,
    accessToken: session.accessToken,
    method:      "POST",
    body:        JSON.stringify(body),
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/voice");
  return { callSid: result.callSid };
}

export async function fetchActiveCall(caseId: string): Promise<ActiveCallViewModel | null> {
  const session = await requireSession();

  const result = await apiFetch<ActiveCallApiResponse>(`/api/cases/${caseId}/calls/active`, {
    tenantId:    session.tenantId,
    accessToken: session.accessToken,
  });

  if (!result.activeCall) return null;

  return {
    callSid: result.activeCall.callSid,
    startedAt: new Date(result.activeCall.startedAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}
