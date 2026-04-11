import { CheckCircle2, PhoneCall, Sparkles } from "lucide-react";
import { KpiCard } from "@/components/molecules/KpiCard";
import { TranscriptFeed } from "./TranscriptFeed";
import { ReviewQueue } from "./ReviewQueue";
import type { VoicePageViewModel } from "../types";

export function VoicePage({ stats, transcripts, pendingEvents }: VoicePageViewModel) {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Calls captured"    value={stats.transcriptCount} icon={PhoneCall}     iconColor="text-blue-500" />
        <KpiCard label="Events extracted"  value={stats.eventCount}      icon={Sparkles}      iconColor="text-green-500" />
        <KpiCard label="Ready for review"  value={stats.pendingCount}    icon={CheckCircle2}  iconColor="text-amber-500" />
      </div>

      {/* Review queue — shown only when there are pending events */}
      {pendingEvents.length > 0 && (
        <ReviewQueue events={pendingEvents} />
      )}

      {/* Transcript feed */}
      <TranscriptFeed transcripts={transcripts} />
    </div>
  );
}
