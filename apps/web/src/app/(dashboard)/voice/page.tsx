import { Suspense } from "react";
import { TopBar } from "@/components/organisms/TopBar";
import { VoicePageContainer } from "@/features/voice/containers/VoicePageContainer";
import { VoiceAutoRefresh } from "@/features/voice/presentation/VoiceAutoRefresh";

export default function VoiceRoute() {
  return (
    <>
      <TopBar title="Voice" />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Polls router.refresh() every 15 s so the server re-fetches transcript/event data */}
        <VoiceAutoRefresh />
        <Suspense fallback={<div className="animate-pulse text-sm text-gray-400">Loading…</div>}>
          <VoicePageContainer />
        </Suspense>
      </main>
    </>
  );
}
