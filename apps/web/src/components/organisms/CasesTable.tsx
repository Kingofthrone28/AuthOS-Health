import Link from "next/link";
import { Eye, MoreHorizontal } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/atoms/Badge";
import type { CaseRowViewModel } from "@/features/dashboard/types";

interface CasesTableProps {
  cases: CaseRowViewModel[];
}

export function CasesTable({ cases }: CasesTableProps) {
  if (cases.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-10 text-center text-sm text-gray-400">
        No cases match the current filters.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Recent Cases</h2>
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
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cases.map((c) => (
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
