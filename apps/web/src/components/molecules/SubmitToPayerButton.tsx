"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send, Loader2, AlertCircle } from "lucide-react";
import type { AuthorizationCaseStatus } from "@authos/shared-types";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

interface SubmitToPayerButtonProps {
  caseId: string;
  status: AuthorizationCaseStatus;
}

const SUBMITTABLE: AuthorizationCaseStatus[] = ["ready_to_submit", "appealed"];

export function SubmitToPayerButton({ caseId, status }: SubmitToPayerButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!SUBMITTABLE.includes(status)) return null;

  const isResubmit = status === "appealed";
  const endpoint = isResubmit
    ? `/api/cases/${encodeURIComponent(caseId)}/resubmit`
    : `/api/cases/${encodeURIComponent(caseId)}/submit`;

  async function handleSubmit() {
    const tenantId = session?.tenantId;
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-tenant-id": tenantId,
      };
      if (session?.accessToken) headers["Authorization"] = `Bearer ${session.accessToken}`;

      const res = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Submission failed (${res.status})`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading
          ? <Loader2 size={15} className="animate-spin" />
          : <Send size={15} />}
        {loading
          ? "Submitting…"
          : isResubmit ? "Resubmit to Payer" : "Submit to Payer"}
      </button>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
