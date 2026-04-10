import { TopBar } from "@/components/organisms/TopBar";

export default function SettingsRoute() {
  return (
    <>
      <TopBar title="Settings" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-10 text-center text-sm text-gray-400">
          Settings — coming in Phase 4.
        </div>
      </main>
    </>
  );
}
