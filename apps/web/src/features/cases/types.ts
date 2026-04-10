import type { AuthorizationCaseStatus, CasePriority } from "@authos/shared-types";

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

export interface CasesFilters {
  q: string;
  status: string;
  priority: string;
}
