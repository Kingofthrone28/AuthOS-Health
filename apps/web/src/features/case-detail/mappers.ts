import type { AuthorizationCaseStatus, CasePriority } from "@authos/shared-types";
import type { CaseDetailViewModel } from "./types";

// ─── API response shape from GET /api/cases/:id ──────────────────────────────

export interface CaseDetailApiResponse {
  id: string;
  status: AuthorizationCaseStatus;
  priority: CasePriority;
  serviceType: string;
  payerName: string;
  payerCaseRef: string | null;
  assignedTo: string | null;
  dueAt: string | null;
  patient: {
    name: string;
    dob: string;
    gender: string | null;
    mrn: string | null;
  };
  coverage: {
    payerName: string;
    planName: string | null;
    memberId: string;
    groupId: string | null;
  };
  requirements: Array<{
    id: string;
    description: string;
    required: boolean;
    completed: boolean;
  }>;
  submissions: Array<{
    id: string;
    protocol: string;
    submittedAt: string;
    responses: Array<{
      decision: string;
      denialReason: string | null;
      denialCode: string | null;
      authNumber: string | null;
    }>;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    classification: string | null;
    uploadedAt: string;
  }>;
  tasks: Array<{
    id: string;
    type: string;
    description: string;
    assignedTo: string | null;
    dueAt: string | null;
  }>;
}

// ─── SLA helpers ─────────────────────────────────────────────────────────────

const SLA_HOURS: Record<CasePriority, number> = {
  urgent: 24,
  expedited: 72,
  standard: 336,
};

function isNearingBreach(dueAt: string | null, priority: CasePriority): boolean {
  if (!dueAt) return false;
  const msRemaining = new Date(dueAt).getTime() - Date.now();
  const hoursLeft = msRemaining / (1000 * 60 * 60);
  const threshold = SLA_HOURS[priority] * 0.25;
  return hoursLeft > 0 && hoursLeft <= threshold;
}

function formatDate(iso: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function toCaseDetailViewModel(api: CaseDetailApiResponse): CaseDetailViewModel {
  // Pull latest payer response from most recent submission
  const latestResponse = api.submissions
    .flatMap((s) => s.responses)
    .at(-1);

  return {
    id: api.id,
    status: api.status,
    priority: api.priority,
    serviceType: api.serviceType,
    payerName: api.payerName,
    payerCaseRef: api.payerCaseRef ?? undefined,
    assignedTo: api.assignedTo ?? undefined,
    dueAt: formatDate(api.dueAt),
    isNearingBreach: isNearingBreach(api.dueAt, api.priority),

    patientName: api.patient.name,
    patientDob: api.patient.dob,
    patientGender: api.patient.gender ?? undefined,
    patientMrn: api.patient.mrn ?? undefined,

    coveragePlanName: api.coverage.planName ?? undefined,
    coverageMemberId: api.coverage.memberId,
    coverageGroupId: api.coverage.groupId ?? undefined,

    authNumber: latestResponse?.authNumber ?? undefined,
    denialReason: latestResponse?.denialReason ?? undefined,
    denialCode: latestResponse?.denialCode ?? undefined,

    requirements: api.requirements.map((r) => ({
      id: r.id,
      description: r.description,
      required: r.required,
      completed: r.completed,
    })),

    submissions: api.submissions.map((s) => ({
      id: s.id,
      protocol: s.protocol,
      submittedAt: formatDate(s.submittedAt) ?? s.submittedAt,
      decision: s.responses.at(-1)?.decision,
      denialReason: s.responses.at(-1)?.denialReason ?? undefined,
    })),

    attachments: api.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      classification: a.classification ?? undefined,
      uploadedAt: formatDate(a.uploadedAt) ?? a.uploadedAt,
    })),

    tasks: api.tasks.map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      assignedTo: t.assignedTo ?? undefined,
      dueAt: formatDate(t.dueAt),
    })),

    extractedEvents: [],
    auditTimeline: [],
  };
}
