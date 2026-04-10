import { Suspense } from "react";
import { CaseDetailContainer } from "@/features/case-detail/containers/CaseDetailContainer";

export default async function CaseDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="p-6">
      <Suspense fallback={<div className="animate-pulse">Loading case...</div>}>
        <CaseDetailContainer caseId={id} />
      </Suspense>
    </main>
  );
}
