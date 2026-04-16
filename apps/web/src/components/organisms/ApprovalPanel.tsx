import { ShieldCheck } from "lucide-react";
import type { AuthorizationCaseStatus } from "@authos/shared-types";

interface ApprovalPanelProps {
  status: AuthorizationCaseStatus;
  authNumber?: string | undefined;
}

export function ApprovalPanel({ status, authNumber }: ApprovalPanelProps) {
  if (status !== "approved") return null;
  if (!authNumber) return null;

  return (
    <section className="bg-green-50 border border-green-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={16} className="text-green-600" />
        <h2 className="text-xs font-semibold text-green-700 uppercase tracking-wider">Approved</h2>
      </div>
      <p className="text-sm text-gray-700">
        <span className="font-medium">Auth #:</span> {authNumber}
      </p>
    </section>
  );
}
