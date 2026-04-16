"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Download, Loader2 } from "lucide-react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

interface DownloadButtonProps {
  attachmentId: string;
  fileName: string;
  tenantId: string;
}

export function DownloadButton({ attachmentId, fileName, tenantId }: DownloadButtonProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "x-tenant-id": tenantId };
      if (session?.accessToken) headers["Authorization"] = `Bearer ${session.accessToken}`;

      const res = await fetch(`${API_URL}/api/documents/${attachmentId}/download`, { headers });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download"
      className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 disabled:opacity-40 transition-colors"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
    </button>
  );
}
