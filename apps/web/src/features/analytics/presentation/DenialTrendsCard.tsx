import type { DenialData } from "../types";

interface Props {
  data: DenialData["data"];
}

export function DenialTrendsCard({ data }: Props) {
  const maxMonthly = Math.max(...data.monthlyTrend.map((m) => m.count), 1);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Denial Trends
      </h3>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{data.deniedCount}</p>
          <p className="text-xs text-gray-500">Denied</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{data.totalCases}</p>
          <p className="text-xs text-gray-500">Total Cases</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{data.denialRate}%</p>
          <p className="text-xs text-gray-500">Denial Rate</p>
        </div>
      </div>

      {/* Top denial reasons */}
      <p className="text-xs text-gray-500 mb-2">Top Denial Reasons</p>
      {data.topReasons.length > 0 ? (
        <ul className="space-y-2 mb-6">
          {data.topReasons.slice(0, 5).map((r, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 truncate flex-1 mr-2">
                {r.reason ?? "Unknown"}
              </span>
              <span className="text-sm font-medium text-gray-800 tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 mb-6">No denials recorded</p>
      )}

      {/* Monthly trend bar chart */}
      <p className="text-xs text-gray-500 mb-2">Monthly Denials</p>
      {data.monthlyTrend.length > 0 ? (
        <div className="flex items-end gap-1 h-20">
          {data.monthlyTrend.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-red-400 rounded-t"
                style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? 4 : 0 }}
                title={`${m.month}: ${m.count}`}
              />
              <span className="text-[10px] text-gray-400 mt-1">{m.month.slice(-2)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center text-sm text-gray-400">
          No trend data
        </div>
      )}
    </div>
  );
}
