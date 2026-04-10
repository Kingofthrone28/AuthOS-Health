import type { AuthorizationCaseStatus, CasePriority } from "@authos/shared-types";

// View model — shaped for the dashboard UI, not raw API responses.
export interface CaseRowViewModel {
  id: string;
  patientName: string;
  payerName: string;
  serviceType: string;
  priority: CasePriority;
  status: AuthorizationCaseStatus;
  assignedTo: string | undefined;
  dueAt: string | undefined;
  isNearingBreach: boolean;
}

export interface ChartDataPoint {
  month: string;
  cases: number;
}

export interface DashboardKpi {
  total: number;
  nearingBreach: number;
  approved: number;
  denied: number;
}

export interface DashboardFilters {
  q: string;
  status: string;
  assignedTo: string | undefined;
}
