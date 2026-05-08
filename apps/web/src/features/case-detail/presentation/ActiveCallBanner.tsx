"use client";

import { useEffect, useState, useTransition } from "react";
import { PhoneCall } from "lucide-react";
import { fetchActiveCall, type ActiveCallViewModel } from "../actions";

interface ActiveCallBannerProps {
  caseId: string;
}

export function ActiveCallBanner({ caseId }: ActiveCallBannerProps) {
  const [activeCall, setActiveCall] = useState<ActiveCallViewModel | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;

    const refresh = () => {
      startTransition(async () => {
        try {
          const next = await fetchActiveCall(caseId);
          if (alive) setActiveCall(next);
        } catch {
          if (alive) setActiveCall(null);
        }
      });
    };

    refresh();
    const id = window.setInterval(refresh, 15000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [caseId]);

  if (!activeCall) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <PhoneCall size={16} className="shrink-0" />
      <div className="min-w-0">
        <p className="font-medium">Call in progress</p>
        <p className="text-xs text-emerald-700">
          {activeCall.callSid} · started {activeCall.startedAt}
        </p>
      </div>
    </div>
  );
}
