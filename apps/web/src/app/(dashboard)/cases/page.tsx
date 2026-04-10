import { Suspense } from "react";
import { TopBar } from "@/components/organisms/TopBar";
import { CasesPageContainer } from "@/features/cases/containers/CasesPageContainer";

export default async function CasesRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <TopBar title="Cases" />
      <main className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<div className="animate-pulse text-sm text-gray-400">Loading…</div>}>
          <CasesPageContainer
            filters={{
              q: params.q ?? "",
              status: params.status ?? "all",
              priority: params.priority ?? "all",
            }}
          />
        </Suspense>
      </main>
    </>
  );
}
