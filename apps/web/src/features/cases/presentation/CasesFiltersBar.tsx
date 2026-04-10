"use client";

import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import type { CasesFilters } from "../types";

const STATUS_OPTIONS = [
  { value: "all",                 label: "All Statuses" },
  { value: "new",                 label: "New" },
  { value: "docs_missing",        label: "Docs Missing" },
  { value: "ready_to_submit",     label: "Ready to Submit" },
  { value: "submitted",           label: "Submitted" },
  { value: "pending_payer",       label: "Pending Payer" },
  { value: "more_info_requested", label: "More Info" },
  { value: "peer_review_needed",  label: "Peer Review" },
  { value: "approved",            label: "Approved" },
  { value: "denied",              label: "Denied" },
  { value: "appealed",            label: "Appealed" },
];

const PRIORITY_OPTIONS = [
  { value: "all",       label: "All Priorities" },
  { value: "urgent",    label: "Urgent" },
  { value: "expedited", label: "Expedited" },
  { value: "standard",  label: "Standard" },
];

interface CasesFiltersBarProps {
  filters: CasesFilters;
}

export function CasesFiltersBar({ filters }: CasesFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams({
      q: filters.q,
      status: filters.status,
      priority: filters.priority,
      [key]: value,
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-lg shadow-sm px-4 py-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          defaultValue={filters.q}
          placeholder="Search patient, service, payer…"
          onChange={(e) => update("q", e.target.value)}
          className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => update("status", e.target.value)}
        className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-gray-700"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Priority */}
      <select
        value={filters.priority}
        onChange={(e) => update("priority", e.target.value)}
        className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-gray-700"
      >
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
