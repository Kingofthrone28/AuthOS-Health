import Link from "next/link";
import { Eye, MoreHorizontal } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/atoms/Badge";
import { requireSession } from "@/lib/session";
import { apiFetch } from "@/lib/api/client";
import type { CasesFilters } from "@/features/cases/types";
import type { AuthorizationCaseStatus, CasePriority } from "@authos/shared-types";

// ─── API shape ───────────────────────────────────────────────────────────────

interface ApiCase {
  id: string;
  status: AuthorizationCaseStatus;
  priority: CasePriority;
  serviceType: string;
  payerName: string;
  assignedTo: string | null;
  dueAt: string | null;
  patient: { name: string };
  coverage: { payerName: string };
}

// ─── SLA helpers ─────────────────────────────────────────────────────────────

const SLA_HOURS: Record<CasePriority, number> = {
  urgent:    24,
  expedited: 72,
  standard:  336,
};

function formatDueAt(dueAt: string | null): string | undefined {
  if (!dueAt) return undefined;
  return new Date(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isNearingBreach(dueAt: string | null, priority: CasePriority): boolean {
  if (!dueAt) return false;
  const msRemaining   = new Date(dueAt).getTime() - Date.now();
  const hoursLeft     = msRemaining / (1000 * 60 * 60);
  const threshold     = SLA_HOURS[priority] * 0.25;
  return hoursLeft > 0 && hoursLeft <= threshold;
}

// ─── View model ──────────────────────────────────────────────────────────────

interface CaseRow {
  id:              string;
  patientName:     string;
  payerName:       string;
  serviceType:     string;
  priority:        CasePriority;
  status:          AuthorizationCaseStatus;
  assignedTo:      string | undefined;
  dueAt:           string | undefined;
  isNearingBreach: boolean;
}

function toRow(c: ApiCase): CaseRow {
  return {
    id:              c.id,
    patientName:     c.patient.name,
    payerName:       c.payerName,
    serviceType:     c.serviceType,
    priority:        c.priority,
    status:          c.status,
    assignedTo:      c.assignedTo ?? undefined,
    dueAt:           formatDueAt(c.dueAt),
    isNearingBreach: isNearingBreach(c.dueAt, c.priority),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CasesTableProps {
  filters: CasesFilters;
}

export async function CasesTable({ filters }: CasesTableProps) {
  const session = await requireSession();

  const params = new URLSearchParams();
  if (filters.status   && filters.status   !== "all") params.set("status",   filters.status);
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.q)                                      params.set("q",        filters.q);

  const qs    = params.toString();
  const path  = `/api/cases${qs ? `?${qs}` : ""}`;

  let rows: CaseRow[] = [];
  try {
    const raw = await apiFetch<ApiCase[]>(path, {
      tenantId: session.tenantId,
    });
    rows = raw.map(toRow);
  } catch {
    // Gracefully degrade on network failure
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-10 text-center text-sm text-gray-400">
        No cases match the current filters.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Cases</h2>
        <span className="text-xs text-gray-400">{rows.length} result{rows.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Service Type</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Patient</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Payer</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Priority</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Due</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Assigned</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                  #{c.id.slice(-6).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{c.serviceType}</td>
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{c.patientName}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.payerName}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PriorityBadge priority={c.priority} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={c.status} />
                </td>
                <td className={`px-4 py-3 text-xs whitespace-nowrap ${c.isNearingBreach ? "text-red-600 font-medium" : "text-gray-500"}`}>
                  {c.dueAt ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {c.assignedTo ?? <span className="text-gray-300">Unassigned</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/cases/${c.id}`}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Eye size={14} />
                    </Link>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
