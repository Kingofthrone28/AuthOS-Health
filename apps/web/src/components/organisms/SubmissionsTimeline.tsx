import { FileText } from "lucide-react";
import type { SubmissionViewModel } from "@/features/case-detail/types";

interface SubmissionsTimelineProps {
  submissions: SubmissionViewModel[];
}

export function SubmissionsTimeline({ submissions }: SubmissionsTimelineProps) {
  if (submissions.length === 0) return null;

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Submissions</h2>
      <ul className="space-y-3">
        {submissions.map((s) => (
          <li key={s.id} className="flex items-start gap-3 text-sm">
            <FileText size={15} className="mt-0.5 text-gray-400 shrink-0" />
            <div>
              <p className="font-medium text-gray-700 capitalize">{s.protocol.toUpperCase()} — {s.submittedAt}</p>
              {s.decision && (
                <p className={`text-xs mt-0.5 ${
                  s.decision === "approved" ? "text-green-600" :
                  s.decision === "denied"   ? "text-red-600"   : "text-gray-500"
                }`}>
                  {s.decision.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
                  {s.denialReason && ` — ${s.denialReason}`}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
