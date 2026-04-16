import { AlertTriangle, CheckCircle, XCircle, Layers } from "lucide-react";
import { KpiCard } from "@/components/molecules/KpiCard";
import { CasesChart } from "@/components/organisms/CasesChart";
import { CasesTable } from "@/components/organisms/CasesTable";
import type { ChartDataPoint, DashboardKpi, DashboardFilters } from "../types";

interface DashboardPageProps {
  filters:   DashboardFilters;
  chartData: ChartDataPoint[];
  kpi:       DashboardKpi;
}

export function DashboardPage({ filters, chartData, kpi }: DashboardPageProps) {
  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="flex flex-wrap gap-4">
        <KpiCard label="Total Cases"     value={kpi.total}          icon={Layers}        iconColor="text-blue-500"   />
        <KpiCard label="Nearing Breach"  value={kpi.nearingBreach}  icon={AlertTriangle}  iconColor="text-orange-500" />
        <KpiCard label="Approved"        value={kpi.approved}       icon={CheckCircle}    iconColor="text-green-500"  />
        <KpiCard label="Denied"          value={kpi.denied}         icon={XCircle}        iconColor="text-red-500"    />
      </div>

      {/* Chart */}
      <CasesChart data={chartData} />

      {/* Table — CasesTable fetches its own data; status filter surfaced from dashboard filters */}
      <CasesTable filters={{ q: filters.q, status: filters.status ?? "all", priority: "all" }} />
    </div>
  );
}
