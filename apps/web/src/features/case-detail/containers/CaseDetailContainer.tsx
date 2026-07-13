import { requireSession } from "@/lib/session";
import { apiFetch } from "@/lib/api/client";
import { CaseDetailPage } from "../presentation/CaseDetailPage";
import { toCaseDetailViewModel, type CaseDetailApiResponse } from "../mappers";

interface CaseDetailContainerProps {
  caseId: string;
}

// Server Component — fetches all case detail data and passes view model to presentation.
export async function CaseDetailContainer({ caseId }: CaseDetailContainerProps) {
  const session = await requireSession();

  let caseDetail = null;
  try {
    const raw = await apiFetch<CaseDetailApiResponse>(`/api/cases/${caseId}`, {
      tenantId: session.tenantId,
      accessToken: session.accessToken,
    });
    caseDetail = toCaseDetailViewModel(raw);
  } catch {
    // 404 or network failure
  }

  if (!caseDetail) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-10 text-center text-sm text-gray-400">
        Case not found.
      </div>
    );
  }

  return <CaseDetailPage caseDetail={caseDetail} />;
}
