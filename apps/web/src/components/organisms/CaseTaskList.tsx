import { Clock } from "lucide-react";
import { CheckRequirementsButton } from "@/components/molecules/CheckRequirementsButton";
import type { TaskViewModel } from "@/features/case-detail/types";

interface CaseTaskListProps {
  tasks: TaskViewModel[];
  caseId: string;
  caseStatus: string;
}

const TERMINAL_STATUSES = ["approved", "denied", "closed"];

export function CaseTaskList({ tasks, caseId, caseStatus }: CaseTaskListProps) {
  if (tasks.length === 0) return null;
  if (TERMINAL_STATUSES.includes(caseStatus)) return null;

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Open Tasks <span className="text-gray-300 font-normal ml-1">({tasks.length})</span>
      </h2>
      <ul className="space-y-3">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-sm">
            <Clock size={14} className="mt-0.5 text-yellow-500 shrink-0" />
            <div className="flex-1">
              <p className="text-gray-700">{t.description}</p>
              {t.dueAt && <p className="text-xs text-gray-400 mt-0.5">Due {t.dueAt}</p>}
              {t.type === "review" && caseStatus === "new" && (
                <div className="mt-2">
                  <CheckRequirementsButton caseId={caseId} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
