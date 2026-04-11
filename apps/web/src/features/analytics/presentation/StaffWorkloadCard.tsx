import type { StaffData } from "../types";

interface Props {
  data: StaffData["data"];
}

export function StaffWorkloadCard({ data }: Props) {
  const maxCases = Math.max(...data.map((s) => s.activeCases), 1);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Staff Workload
      </h3>

      {data.length > 0 ? (
        <div className="space-y-3">
          {data.map((s) => (
            <div key={s.staffId ?? "unassigned"} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 w-28 truncate">
                {s.staffId ?? "Unassigned"}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${(s.activeCases / maxCases) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-800 tabular-nums w-8 text-right">
                  {s.activeCases}
                </span>
              </div>
              <span className="text-xs text-gray-400 w-20 text-right">
                {s.touchCount} touches
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">No staff assignments yet</p>
      )}
    </div>
  );
}
