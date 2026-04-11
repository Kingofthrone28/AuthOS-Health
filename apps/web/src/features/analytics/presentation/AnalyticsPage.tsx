import type { AnalyticsPageViewModel } from "../types";
import { TurnaroundCard } from "./TurnaroundCard";
import { DenialTrendsCard } from "./DenialTrendsCard";
import { PayerPerformanceCard } from "./PayerPerformanceCard";
import { StaffWorkloadCard } from "./StaffWorkloadCard";

export function AnalyticsPage({ turnaround, denials, payers, staff }: AnalyticsPageViewModel) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TurnaroundCard data={turnaround.data} />
      <DenialTrendsCard data={denials.data} />
      <PayerPerformanceCard data={payers.data} />
      <StaffWorkloadCard data={staff.data} />
    </div>
  );
}
