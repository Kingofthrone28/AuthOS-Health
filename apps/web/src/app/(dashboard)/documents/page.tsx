import { Suspense } from "react";
import { TopBar } from "@/components/organisms/TopBar";
import { DocumentsPageContainer } from "@/features/documents/containers/DocumentsPageContainer";

export default function DocumentsRoute() {
  return (
    <>
      <TopBar title="Documents" />
      <main className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<div className="animate-pulse text-sm text-gray-400">Loading…</div>}>
          <DocumentsPageContainer />
        </Suspense>
      </main>
    </>
  );
}
