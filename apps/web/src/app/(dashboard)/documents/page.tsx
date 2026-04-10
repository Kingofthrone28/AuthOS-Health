import { TopBar } from "@/components/organisms/TopBar";

export default function DocumentsRoute() {
  return (
    <>
      <TopBar title="Documents" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-10 text-center text-sm text-gray-400">
          Documents — coming in Phase 2.
        </div>
      </main>
    </>
  );
}
