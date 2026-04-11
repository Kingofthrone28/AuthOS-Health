import type { TurnaroundData } from "../types";

interface Props {
  data: TurnaroundData["data"];
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-400",
  requirements_found: "bg-blue-300",
  docs_missing: "bg-yellow-400",
  ready_to_submit: "bg-blue-500",
  submitted: "bg-indigo-400",
  pending_payer: "bg-orange-400",
  more_info_requested: "bg-amber-400",
  peer_review_needed: "bg-purple-400",
  approved: "bg-green-500",
  denied: "bg-red-500",
  appealed: "bg-pink-400",
  closed: "bg-gray-300",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TurnaroundCard({ data }: Props) {
  const totalCases = data.statusDistribution.reduce((sum, s) => sum + s.count, 0);
  const priorities = Object.entries(data.turnaroundByPriority);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Turnaround Time
      </h3>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {priorities.length > 0 ? (
          priorities.map(([priority, stats]) => (
            <div key={priority} className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {stats.avgHours > 0 ? `${stats.avgHours}h` : "—"}
              </p>
              <p className="text-xs text-gray-500 capitalize">{priority}</p>
              <p className="text-xs text-gray-400">{stats.count} cases</p>
            </div>
          ))
        ) : (
          <p className="col-span-3 text-sm text-gray-400 text-center">No completed cases yet</p>
        )}
      </div>

      {/* Status distribution bar */}
      <p className="text-xs text-gray-500 mb-2">Status Distribution ({totalCases} total)</p>
      {totalCases > 0 ? (
        <div className="flex h-4 rounded-full overflow-hidden">
          {data.statusDistribution
            .filter((s) => s.count > 0)
            .map((s) => (
              <div
                key={s.status}
                className={`${STATUS_COLORS[s.status] ?? "bg-gray-300"}`}
                style={{ width: `${(s.count / totalCases) * 100}%` }}
                title={`${formatStatus(s.status)}: ${s.count}`}
              />
            ))}
        </div>
      ) : (
        <div className="h-4 rounded-full bg-gray-100" />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        {data.statusDistribution
          .filter((s) => s.count > 0)
          .map((s) => (
            <div key={s.status} className="flex items-center gap-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[s.status] ?? "bg-gray-300"}`}
              />
              <span className="text-xs text-gray-500">{formatStatus(s.status)} ({s.count})</span>
            </div>
          ))}
      </div>
    </div>
  );
}
