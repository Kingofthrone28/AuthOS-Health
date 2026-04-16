import { CheckCircle2, Circle } from "lucide-react";
import { CompleteRequirementButton } from "@/components/molecules/CompleteRequirementButton";
import { CaseUploadButton } from "@/components/molecules/CaseUploadButton";
import type { RequirementViewModel } from "@/features/case-detail/types";

const ACTIVE_STATUSES = ["requirements_found", "docs_missing", "more_info_requested", "ready_to_submit"];
const TERMINAL_STATUSES = ["approved", "denied", "closed"];

interface RequirementsChecklistProps {
  requirements: RequirementViewModel[];
  caseId: string;
  caseStatus: string;
}

export function RequirementsChecklist({ requirements, caseId, caseStatus }: RequirementsChecklistProps) {
  if (requirements.length === 0) return null;
  if (TERMINAL_STATUSES.includes(caseStatus)) return null;

  const done = requirements.filter((r) => r.completed).length;
  const showActions = ACTIVE_STATUSES.includes(caseStatus);

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Requirements</h2>
        <span className="text-xs text-gray-400">{done}/{requirements.length} complete</span>
      </div>
      <ul className="space-y-2">
        {requirements.map((r) => {
          const isActive = showActions && r.required && !r.completed;
          return (
            <li
              key={r.id}
              className={`flex items-start gap-2 text-sm rounded-md px-2 py-1.5 -mx-2 ${isActive ? "bg-orange-50" : ""}`}
            >
              {r.completed
                ? <CheckCircle2 size={15} className="mt-0.5 text-green-500 shrink-0" />
                : <Circle       size={15} className={`mt-0.5 shrink-0 ${isActive ? "text-orange-400" : "text-gray-300"}`} />}
              <span className={r.completed ? "text-gray-400 line-through" : "text-gray-700 flex-1"}>
                {r.description}
                {r.required && !r.completed && (
                  <span className="ml-1.5 text-xs text-orange-500 font-medium">Required</span>
                )}
              </span>
              {isActive && (
                <span className="ml-auto flex items-center gap-2 shrink-0">
                  <CaseUploadButton caseId={caseId} reqId={r.id} />
                  <CompleteRequirementButton caseId={caseId} reqId={r.id} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
