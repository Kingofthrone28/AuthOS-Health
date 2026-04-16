import { AlertTriangle } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/atoms/Badge";
import type { AuthorizationCaseStatus, CasePriority } from "@authos/shared-types";

interface CaseStatusBarProps {
  status: AuthorizationCaseStatus;
  priority: CasePriority;
  serviceType: string;
  dueAt?: string | undefined;
  isNearingBreach: boolean;
  assignedTo?: string | undefined;
}

export function CaseStatusBar({ status, priority, serviceType, dueAt, isNearingBreach, assignedTo }: CaseStatusBarProps) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <StatusBadge status={status} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Priority</p>
          <PriorityBadge priority={priority} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Service</p>
          <p className="text-sm font-medium text-gray-800">{serviceType}</p>
        </div>
        {dueAt && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Due</p>
            <p className={`text-sm font-medium ${isNearingBreach ? "text-red-600" : "text-gray-700"}`}>
              {isNearingBreach && <AlertTriangle size={12} className="inline mr-1" />}
              {dueAt}
            </p>
          </div>
        )}
        {assignedTo && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Assigned</p>
            <p className="text-sm text-gray-700 font-mono">{assignedTo.slice(-8)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
