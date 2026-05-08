import { CaseStatusBar }         from "@/components/molecules/CaseStatusBar";
import { SubmitToPayerButton }    from "@/components/molecules/SubmitToPayerButton";
import { PatientSnapshot }        from "@/components/organisms/PatientSnapshot";
import { InsuranceSnapshot }      from "@/components/organisms/InsuranceSnapshot";
import { RequirementsChecklist }  from "@/components/organisms/RequirementsChecklist";
import { SubmissionsTimeline }    from "@/components/organisms/SubmissionsTimeline";
import { DenialReasonPanel }      from "@/components/organisms/DenialReasonPanel";
import { ApprovalPanel }          from "@/components/organisms/ApprovalPanel";
import { CaseAttachmentsList }    from "@/components/organisms/CaseAttachmentsList";
import { CaseTaskList }           from "@/components/organisms/CaseTaskList";
import type { CaseDetailViewModel } from "../types";
import { ActiveCallBanner } from "./ActiveCallBanner";
import { CallPayerButton } from "./CallPayerButton";

interface CaseDetailPageProps {
  caseDetail: CaseDetailViewModel;
}

export function CaseDetailPage({ caseDetail }: CaseDetailPageProps) {
  return (
    <article className="space-y-4 max-w-4xl">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{caseDetail.patientName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Case #{caseDetail.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <CallPayerButton caseId={caseDetail.id} />
          <SubmitToPayerButton caseId={caseDetail.id} status={caseDetail.status} />
        </div>
      </header>

      <ActiveCallBanner caseId={caseDetail.id} />

      <CaseStatusBar
        status={caseDetail.status}
        priority={caseDetail.priority}
        serviceType={caseDetail.serviceType}
        dueAt={caseDetail.dueAt}
        isNearingBreach={caseDetail.isNearingBreach}
        assignedTo={caseDetail.assignedTo}
      />

      <ApprovalPanel   status={caseDetail.status} authNumber={caseDetail.authNumber} />
      <DenialReasonPanel status={caseDetail.status} denialCode={caseDetail.denialCode} denialReason={caseDetail.denialReason} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PatientSnapshot
          name={caseDetail.patientName}
          dob={caseDetail.patientDob}
          gender={caseDetail.patientGender}
          mrn={caseDetail.patientMrn}
        />
        <InsuranceSnapshot
          payerName={caseDetail.payerName}
          planName={caseDetail.coveragePlanName}
          memberId={caseDetail.coverageMemberId}
          groupId={caseDetail.coverageGroupId}
          payerCaseRef={caseDetail.payerCaseRef}
          authNumber={caseDetail.authNumber}
        />
      </div>

      <RequirementsChecklist
        requirements={caseDetail.requirements}
        caseId={caseDetail.id}
        caseStatus={caseDetail.status}
      />
      <CaseTaskList           tasks={caseDetail.tasks} caseId={caseDetail.id} caseStatus={caseDetail.status} />
      <SubmissionsTimeline    submissions={caseDetail.submissions} />
      <CaseAttachmentsList    attachments={caseDetail.attachments} />
    </article>
  );
}
