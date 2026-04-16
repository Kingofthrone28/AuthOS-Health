"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Paperclip, Loader2 } from "lucide-react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.tiff";
const MAX_MB = 25;

interface CaseUploadButtonProps {
  caseId: string;
  /** When provided, marks the requirement complete after all uploads succeed. */
  reqId?: string;
}

export function CaseUploadButton({ caseId, reqId }: CaseUploadButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    setError(null);
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const oversized = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (oversized) {
      setError(`"${oversized.name}" exceeds ${MAX_MB} MB.`);
      return;
    }

    const tenantId = session?.tenantId;
    if (!tenantId) { setError("Session expired."); return; }

    setUploading(true);
    setError(null);

    try {
      const headers: Record<string, string> = { "x-tenant-id": tenantId };
      if (session?.accessToken) headers["Authorization"] = `Bearer ${session.accessToken}`;

      // Upload all selected files in sequence
      for (const file of files) {
        const res = await fetch(
          `${API_URL}/api/cases/${encodeURIComponent(caseId)}/attachments` +
          `?fileName=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/octet-stream" },
            body: await file.arrayBuffer(),
          }
        );
        if (!res.ok) throw new Error(`Upload failed for "${file.name}" (${res.status})`);
      }

      // Auto-complete the linked requirement once all uploads succeed
      if (reqId) {
        const res = await fetch(
          `${API_URL}/api/cases/${encodeURIComponent(caseId)}/requirements/${encodeURIComponent(reqId)}/complete`,
          { method: "POST", headers }
        );
        if (!res.ok) throw new Error(`Could not mark requirement complete (${res.status})`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className="shrink-0 flex flex-col items-end gap-0.5">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={openPicker}
        disabled={uploading}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 disabled:opacity-40 transition-colors"
      >
        {uploading
          ? <Loader2 size={13} className="animate-spin" />
          : <Paperclip size={13} />}
        {uploading ? "Uploading…" : "Attach file"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
