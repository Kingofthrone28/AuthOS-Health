import { TopBar } from "@/components/organisms/TopBar";
import { SettingsPageContainer } from "@/features/settings/containers/SettingsPageContainer";

export default function SettingsRoute() {
  return (
    <>
      <TopBar title="Settings" />
      <main className="flex-1 overflow-y-auto p-6">
        <SettingsPageContainer />
      </main>
    </>
  );
}
