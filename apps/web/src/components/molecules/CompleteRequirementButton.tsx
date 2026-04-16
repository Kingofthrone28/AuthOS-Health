"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

interface CompleteRequirementButtonProps {
  caseId: string;
  reqId: string;
}

export function CompleteRequirementButton({ caseId, reqId }: CompleteRequirementButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleComplete() {
    const tenantId = session?.tenantId;
    if (!tenantId) return;

    setLoading(true);
    try {
      const headers: Record<string, string> = { "x-tenant-id": tenantId };
      if (session?.accessToken) headers["Authorization"] = `Bearer ${session.accessToken}`;

      const res = await fetch(
        `${API_URL}/api/cases/${encodeURIComponent(caseId)}/requirements/${encodeURIComponent(reqId)}/complete`,
        { method: "POST", headers }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      setDone(true);
      router.refresh();
    } catch {
      // Leave button in place — server-rendered state will correct on next load
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <button
      onClick={handleComplete}
      disabled={loading}
      className="ml-auto shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors"
    >
      {loading
        ? <Loader2 size={13} className="animate-spin" />
        : <CheckCircle2 size={13} />}
      {loading ? "Saving…" : "Mark complete"}
    </button>
  );
}
