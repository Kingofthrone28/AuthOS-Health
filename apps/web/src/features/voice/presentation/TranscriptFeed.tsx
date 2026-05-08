import { Mic } from "lucide-react";
import type { TranscriptRowViewModel } from "../types";

interface Props {
  transcripts: TranscriptRowViewModel[];
}

export function TranscriptFeed({ transcripts }: Props) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Mic size={16} className="text-blue-500" />
        <h2 className="text-sm font-semibold text-gray-800">Recent transcripts</h2>
        <span className="ml-auto text-xs text-gray-400">{transcripts.length} total</span>
      </div>

      {transcripts.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">
          No transcripts yet. Transcripts appear here after the voice worker posts a completed call.
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {transcripts.map((t) => (
            <li key={t.id} className="px-5 py-4 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-gray-500">{t.callSid}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">
                    {t.caseId ? `Case ${t.caseId.slice(0, 8)}` : "Unlinked"}
                  </span>
                  {t.status === "IN_PROGRESS" && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.direction} · {t.startedAt} · {t.status === "IN_PROGRESS" ? "in progress" : t.duration}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs text-gray-700">{t.eventCount} event{t.eventCount !== 1 ? "s" : ""}</p>
                {t.pendingReviewCount > 0 && (
                  <p className="text-xs text-amber-600 font-medium">{t.pendingReviewCount} pending</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
