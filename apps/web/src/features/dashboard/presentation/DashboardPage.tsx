import { AlertTriangle, CheckCircle, XCircle, Layers } from "lucide-react";
import { KpiCard } from "@/components/molecules/KpiCard";
import { CasesChart } from "@/components/organisms/CasesChart";
import { CasesTable } from "@/components/organisms/CasesTable";
import type { CaseRowViewModel, ChartDataPoint, DashboardKpi } from "../types";

interface DashboardPageProps {
  cases: CaseRowViewModel[];
  chartData: ChartDataPoint[];
  kpi: DashboardKpi;
}

export function DashboardPage({ cases, chartData, kpi }: DashboardPageProps) {
  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="flex flex-wrap gap-4">
        <KpiCard label="Total Cases"      value={kpi.total}         icon={Layers}        iconColor="text-blue-500" />
        <KpiCard label="Nearing Breach"   value={kpi.nearingBreach} icon={AlertTriangle}  iconColor="text-orange-500" />
        <KpiCard label="Approved"         value={kpi.approved}      icon={CheckCircle}    iconColor="text-green-500" />
        <KpiCard label="Denied"           value={kpi.denied}        icon={XCircle}        iconColor="text-red-500" />
      </div>

      {/* Chart */}
      <CasesChart data={chartData} />

      {/* Table */}
      <CasesTable cases={cases} />
    </div>
  );
}
