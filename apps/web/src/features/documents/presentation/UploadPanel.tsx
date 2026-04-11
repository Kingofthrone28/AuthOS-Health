"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText } from "lucide-react";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
const MAX_SIZE_MB = 25;

interface SelectedFile {
  file: File;
  preview: string;
}

export function UploadPanel() {
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [caseId, setCaseId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) validate(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validate(file);
  }

  function validate(file: File) {
    setError(null);
    setSuccess(false);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only PDF, JPEG, PNG, and TIFF files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    setSelected({ file, preview: file.name });
  }

  async function handleUpload() {
    if (!selected || !caseId.trim()) {
      setError("A case ID is required to upload a document.");
      return;
    }
    const tenantId = window.sessionStorage.getItem("tenantId")?.trim();
    if (!tenantId) {
      setError("A tenant is required to upload a document.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const buffer = await selected.file.arrayBuffer();
      const res = await fetch(
        `/api/cases/${encodeURIComponent(caseId.trim())}/attachments?fileName=${encodeURIComponent(selected.file.name)}&mimeType=${encodeURIComponent(selected.file.type)}`,
        {
          method:  "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "x-tenant-id":  tenantId,
          },
          body: buffer,
        }
      );
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      setSuccess(true);
      setSelected(null);
      setCaseId("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Upload Document</h2>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff" className="hidden" onChange={handleChange} />
          {selected ? (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText size={18} className="text-blue-500 shrink-0" />
              <span className="truncate max-w-xs">{selected.preview}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected(null); }}
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={22} className="text-gray-400" />
              <p className="text-sm text-gray-500 text-center">
                Drop a file here or <span className="text-blue-600 font-medium">browse</span>
              </p>
              <p className="text-xs text-gray-400">PDF, JPEG, PNG, TIFF — up to {MAX_SIZE_MB} MB</p>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:w-60">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Case ID</label>
            <input
              type="text"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="e.g. case-001abc"
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !selected || !caseId.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload"}
          </button>

          {error   && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">Document uploaded successfully.</p>}
        </div>
      </div>
    </div>
  );
}
