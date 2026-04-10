import type { DashboardFilters, CaseRowViewModel } from "../types";
import { DashboardPage } from "../presentation/DashboardPage";

interface DashboardPageContainerProps {
  filters: DashboardFilters;
}

// Stub data — replace with real API calls when the database is wired.
const STUB_CASES: CaseRowViewModel[] = [
  {
    id: "case-001abc",
    patientName: "Jane Doe",
    payerName: "Aetna",
    serviceType: "MRI Brain w/ Contrast",
    priority: "expedited",
    status: "docs_missing",
    assignedTo: "P. Smith",
    dueAt: "Apr 12",
    isNearingBreach: true,
  },
  {
    id: "case-002def",
    patientName: "Robert Chen",
    payerName: "UnitedHealth",
    serviceType: "Physical Therapy",
    priority: "standard",
    status: "pending_payer",
    assignedTo: "T. Jones",
    dueAt: "Apr 15",
    isNearingBreach: false,
  },
  {
    id: "case-003ghi",
    patientName: "Maria Lopez",
    payerName: "Cigna",
    serviceType: "Spinal Fusion L4-L5",
    priority: "urgent",
    status: "peer_review_needed",
    assignedTo: undefined,
    dueAt: "Apr 11",
    isNearingBreach: true,
  },
  {
    id: "case-004jkl",
    patientName: "David Park",
    payerName: "BlueCross",
    serviceType: "Knee Arthroscopy",
    priority: "standard",
    status: "approved",
    assignedTo: "P. Smith",
    dueAt: undefined,
    isNearingBreach: false,
  },
  {
    id: "case-005mno",
    patientName: "Susan White",
    payerName: "Humana",
    serviceType: "Chemotherapy Cycle 3",
    priority: "expedited",
    status: "denied",
    assignedTo: "T. Jones",
    dueAt: "Apr 13",
    isNearingBreach: false,
  },
];

const STUB_CHART_DATA = [
  { month: "Nov", cases: 38 },
  { month: "Dec", cases: 52 },
  { month: "Jan", cases: 61 },
  { month: "Feb", cases: 45 },
  { month: "Mar", cases: 70 },
  { month: "Apr", cases: 57 },
];

export async function DashboardPageContainer({ filters }: DashboardPageContainerProps) {
  const filtered = STUB_CASES.filter((c) => {
    if (filters.status !== "all" && c.status !== filters.status) return false;
    if (filters.assignedTo && c.assignedTo !== filters.assignedTo) return false;
    if (
      filters.q &&
      !c.patientName.toLowerCase().includes(filters.q.toLowerCase()) &&
      !c.serviceType.toLowerCase().includes(filters.q.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <DashboardPage
      cases={filtered}
      chartData={STUB_CHART_DATA}
      kpi={{
        total: STUB_CASES.length,
        nearingBreach: STUB_CASES.filter((c) => c.isNearingBreach).length,
        approved: STUB_CASES.filter((c) => c.status === "approved").length,
        denied: STUB_CASES.filter((c) => c.status === "denied").length,
      }}
    />
  );
}
