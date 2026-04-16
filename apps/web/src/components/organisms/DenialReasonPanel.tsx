import { ShieldX } from "lucide-react";
import type { AuthorizationCaseStatus } from "@authos/shared-types";

interface DenialReasonPanelProps {
  status: AuthorizationCaseStatus;
  denialCode?: string | undefined;
  denialReason?: string | undefined;
}

export function DenialReasonPanel({ status, denialCode, denialReason }: DenialReasonPanelProps) {
  if (status !== "denied" && status !== "appealed") return null;
  if (!denialReason && !denialCode) return null;

  return (
    <section className="bg-red-50 border border-red-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        <ShieldX size={16} className="text-red-500" />
        <h2 className="text-xs font-semibold text-red-700 uppercase tracking-wider">Denial</h2>
      </div>
      <div className="text-sm space-y-1">
        {denialCode   && <p className="text-gray-700"><span className="font-medium">Code:</span> {denialCode}</p>}
        {denialReason && <p className="text-gray-700">{denialReason}</p>}
      </div>
    </section>
  );
}
