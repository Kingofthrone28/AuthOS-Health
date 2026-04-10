import type { CaseDetailViewModel } from "../types";
import { CaseDetailPage } from "../presentation/CaseDetailPage";

interface CaseDetailContainerProps {
  caseId: string;
}

// Server Component — fetches all case detail data and passes view model to presentation.
export async function CaseDetailContainer({ caseId }: CaseDetailContainerProps) {
  // TODO: fetch case, requirements, submissions, attachments, events, audit trail
  // TODO: map to CaseDetailViewModel
  const caseDetail: CaseDetailViewModel | null = null;

  if (!caseDetail) {
    return <p className="text-gray-500">Case not found.</p>;
  }

  return <CaseDetailPage caseDetail={caseDetail} />;
}
