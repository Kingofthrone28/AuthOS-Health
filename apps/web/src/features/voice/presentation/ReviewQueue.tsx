"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { reviewExtractedEvent } from "../actions";
import type { PendingEventViewModel } from "../types";

const EVENT_TYPE_LABELS: Record<string, string> = {
  reference_number:     "Reference #",
  auth_status:          "Auth Status",
  missing_document:     "Missing Doc",
  denial_reason:        "Denial Reason",
  peer_review_required: "Peer Review",
  callback_deadline:    "Callback Date",
  approval_number:      "Approval #",
  other:                "Other",
};

interface ReviewRowProps {
  event: PendingEventViewModel;
}

function ReviewRow({ event }: ReviewRowProps) {
  const [isPending, startTransition] = useTransition();

  function submit(decision: "approved" | "rejected") {
    startTransition(() => {
      void reviewExtractedEvent(event.id, decision);
    });
  }

  return (
    <li className="px-5 py-4 flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-700">
            {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
          </span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-600 font-mono">{event.value}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Case {event.caseId.slice(0, 8)} · confidence {event.confidencePct} · {event.extractedAt}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          disabled={isPending}
          onClick={() => submit("approved")}
          className="text-xs px-3 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          disabled={isPending}
          onClick={() => submit("rejected")}
          className="text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </li>
  );
}

interface Props {
  events: PendingEventViewModel[];
}

export function ReviewQueue({ events }: Props) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-amber-100">
      <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
        <Sparkles size={16} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-gray-800">Review queue</h2>
        <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          {events.length} pending
        </span>
      </div>
      <ul className="divide-y divide-gray-50">
        {events.map((e) => (
          <ReviewRow key={e.id} event={e} />
        ))}
      </ul>
    </section>
  );
}
