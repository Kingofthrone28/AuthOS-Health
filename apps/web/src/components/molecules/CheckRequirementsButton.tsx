"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2, AlertCircle } from "lucide-react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

interface CheckRequirementsButtonProps {
  caseId: string;
}

export function CheckRequirementsButton({ caseId }: CheckRequirementsButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
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

      const res = await fetch(
        `${API_URL}/api/cases/${encodeURIComponent(caseId)}/check-requirements`,
        { method: "POST", headers },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Requirements check failed (${res.status})`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Requirements check failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleCheck}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors"
      >
        {loading
          ? <Loader2 size={13} className="animate-spin" />
          : <ClipboardCheck size={13} />}
        {loading ? "Checking…" : "Check Requirements"}
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
