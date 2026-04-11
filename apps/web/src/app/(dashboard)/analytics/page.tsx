import { Suspense } from "react";
import { TopBar } from "@/components/organisms/TopBar";
import { AnalyticsPageContainer } from "@/features/analytics/containers/AnalyticsPageContainer";

export default function AnalyticsRoute() {
  return (
    <>
      <TopBar title="Analytics" />
      <main className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<div className="animate-pulse text-sm text-gray-400">Loading analytics…</div>}>
          <AnalyticsPageContainer />
        </Suspense>
      </main>
    </>
  );
}
