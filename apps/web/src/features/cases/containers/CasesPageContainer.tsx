import type { CasesFilters, CaseRowViewModel } from "../types";
import { CasesPage } from "../presentation/CasesPage";

interface CasesPageContainerProps {
  filters: CasesFilters;
}

// Stub data — replace with real API call when database is wired.
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
  {
    id: "case-006pqr",
    patientName: "Tom Harris",
    payerName: "Aetna",
    serviceType: "Hip Replacement",
    priority: "standard",
    status: "submitted",
    assignedTo: "P. Smith",
    dueAt: "Apr 18",
    isNearingBreach: false,
  },
  {
    id: "case-007stu",
    patientName: "Linda Nguyen",
    payerName: "Cigna",
    serviceType: "Cardiac Catheterization",
    priority: "urgent",
    status: "new",
    assignedTo: undefined,
    dueAt: "Apr 11",
    isNearingBreach: true,
  },
];

export async function CasesPageContainer({ filters }: CasesPageContainerProps) {
  const filtered = STUB_CASES.filter((c) => {
    if (filters.status !== "all" && c.status !== filters.status) return false;
    if (filters.priority !== "all" && c.priority !== filters.priority) return false;
    if (
      filters.q &&
      !c.patientName.toLowerCase().includes(filters.q.toLowerCase()) &&
      !c.serviceType.toLowerCase().includes(filters.q.toLowerCase()) &&
      !c.payerName.toLowerCase().includes(filters.q.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return <CasesPage cases={filtered} filters={filters} total={STUB_CASES.length} />;
}
