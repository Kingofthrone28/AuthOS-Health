import { apiFetch } from "@/lib/api/client";
import type { TurnaroundData, DenialData, PayerData, StaffData } from "../types";
import { AnalyticsPage } from "../presentation/AnalyticsPage";

export async function AnalyticsPageContainer() {
  const tenantId = "default";

  const [turnaround, denials, payers, staff] = await Promise.all([
    apiFetch<TurnaroundData>("/api/analytics/turnaround", { tenantId }),
    apiFetch<DenialData>("/api/analytics/denials", { tenantId }),
    apiFetch<PayerData>("/api/analytics/payers", { tenantId }),
    apiFetch<StaffData>("/api/analytics/staff", { tenantId }),
  ]);

  return (
    <AnalyticsPage
      turnaround={turnaround}
      denials={denials}
      payers={payers}
      staff={staff}
    />
  );
}
