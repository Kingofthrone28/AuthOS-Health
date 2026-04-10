import type { CaseDetailViewModel } from "../types";

interface CaseDetailPageProps {
  caseDetail: CaseDetailViewModel;
}

// Presentation component — renders case detail panels from view model props only.
export function CaseDetailPage({ caseDetail }: CaseDetailPageProps) {
  return (
    <article>
      <header className="mb-6">
        <h1 className="text-xl font-semibold">{caseDetail.patientName}</h1>
        <p className="text-sm text-gray-500">
          {caseDetail.payerName} · {caseDetail.serviceType} · {caseDetail.status}
        </p>
      </header>
      {/* TODO: PatientSnapshot molecule */}
      {/* TODO: InsuranceSnapshot molecule */}
      {/* TODO: AuthTimeline organism */}
      {/* TODO: RequirementsChecklist organism */}
      {/* TODO: VoiceTranscriptPanel organism */}
      {/* TODO: AttachmentsList organism */}
      {/* TODO: DenialReasonPanel molecule */}
      {/* TODO: AuditLog organism */}
    </article>
  );
}
