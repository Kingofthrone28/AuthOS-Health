import { Suspense } from "react";
import { TopBar } from "@/components/organisms/TopBar";
import { DashboardPageContainer } from "@/features/dashboard/containers/DashboardPageContainer";

export default async function DashboardRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; assignedTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <TopBar title="Work Queue" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        <Suspense fallback={<div className="animate-pulse text-sm text-gray-400">Loading…</div>}>
          <DashboardPageContainer
            filters={{
              q: params.q ?? "",
              status: params.status ?? "all",
              assignedTo: params.assignedTo,
            }}
          />
        </Suspense>
      </main>
    </>
  );
}
