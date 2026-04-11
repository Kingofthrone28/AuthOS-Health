import type { PayerData } from "../types";

interface Props {
  data: PayerData["data"];
}

export function PayerPerformanceCard({ data }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Payer Performance
      </h3>

      {data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500">Payer</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Cases</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Approval</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Denial</th>
                <th className="text-right py-2 pl-3 text-xs font-medium text-gray-500">Avg Resp</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.payer} className="border-b border-gray-50">
                  <td className="py-2 pr-3 font-medium text-gray-700">{p.payer}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-600">{p.totalCases}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-green-600">{p.approvalRate}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-red-600">{p.denialRate}%</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-gray-600">
                    {p.avgResponseHours > 0 ? `${p.avgResponseHours}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">No payer data available</p>
      )}
    </div>
  );
}
