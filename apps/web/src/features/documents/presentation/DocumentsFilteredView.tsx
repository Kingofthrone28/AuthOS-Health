"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { AttachmentsTable } from "@/components/organisms/AttachmentsTable";
import type { AttachmentViewModel } from "../types";

const CLASSIFICATIONS = [
  { value: "",               label: "All types" },
  { value: "clinical_notes", label: "Clinical Notes" },
  { value: "imaging_report", label: "Imaging Report" },
  { value: "lab_results",    label: "Lab Results" },
  { value: "denial_letter",  label: "Denial Letter" },
  { value: "appeal_letter",  label: "Appeal Letter" },
  { value: "auth_form",      label: "Auth Form" },
  { value: "unclassified",   label: "Unclassified" },
];

interface DocumentsFilteredViewProps {
  documents: AttachmentViewModel[];
}

export function DocumentsFilteredView({ documents }: DocumentsFilteredViewProps) {
  const [q, setQ]                         = useState("");
  const [classification, setClassification] = useState("");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return documents.filter((doc) => {
      if (search) {
        const matchesFile = doc.fileName.toLowerCase().includes(search);
        const matchesCase = doc.caseId.toLowerCase().includes(search) ||
                            doc.caseId.slice(-6).toLowerCase().includes(search);
        if (!matchesFile && !matchesCase) return false;
      }

      if (classification && doc.classification !== classification) return false;

      if (dateFrom) {
        const uploaded = new Date(doc.uploadedAtIso);
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (uploaded < from) return false;
      }

      if (dateTo) {
        const uploaded = new Date(doc.uploadedAtIso);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (uploaded > to) return false;
      }

      return true;
    });
  }, [documents, q, classification, dateFrom, dateTo]);

  const hasFilters = q || classification || dateFrom || dateTo;

  function clearFilters() {
    setQ("");
    setClassification("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="File name or case ID…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50"
              />
            </div>
          </div>

          {/* Classification */}
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 text-gray-700"
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 text-gray-700"
            />
          </div>

          {/* Date to */}
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 text-gray-700"
            />
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>

        {/* Result count */}
        <p className="text-xs text-gray-400 mt-3">
          {filtered.length === documents.length
            ? `${documents.length} document${documents.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${documents.length} documents`}
        </p>
      </div>

      <AttachmentsTable documents={filtered} />
    </div>
  );
}
