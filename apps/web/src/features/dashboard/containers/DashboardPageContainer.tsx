import { requireSession } from "@/lib/session";
import { apiFetch } from "@/lib/api/client";
import { DashboardPage } from "../presentation/DashboardPage";
import type { DashboardFilters, ChartDataPoint, DashboardKpi } from "../types";

interface DashboardPageContainerProps {
  filters: DashboardFilters;
}

interface ApiKpi {
  total:        number;
  approved:     number;
  denied:       number;
  nearingBreach: number;
}

// Stub chart data until a dedicated time-series endpoint exists
const STUB_CHART_DATA: ChartDataPoint[] = [
  { month: "Nov", cases: 38 },
  { month: "Dec", cases: 52 },
  { month: "Jan", cases: 61 },
  { month: "Feb", cases: 45 },
  { month: "Mar", cases: 70 },
  { month: "Apr", cases: 57 },
];

export async function DashboardPageContainer({ filters }: DashboardPageContainerProps) {
  const session = await requireSession();

  let kpi: DashboardKpi = { total: 0, nearingBreach: 0, approved: 0, denied: 0 };
  try {
    const raw = await apiFetch<ApiKpi>("/api/analytics/kpi", {
      tenantId:    session.tenantId,
      accessToken: session.accessToken,
    });
    kpi = raw;
  } catch {
    // Gracefully degrade — KPI cards show zeros rather than crashing
  }

  return (
    <DashboardPage
      filters={filters}
      chartData={STUB_CHART_DATA}
      kpi={kpi}
    />
  );
}
