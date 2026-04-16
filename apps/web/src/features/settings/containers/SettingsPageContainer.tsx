import { requireSession } from "@/lib/session";
import { SettingsPage } from "../presentation/SettingsPage";
import type { SettingsViewModel } from "../types";

export async function SettingsPageContainer() {
  const session = await requireSession();

  const viewModel: SettingsViewModel = {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
    tenant: {
      id: session.tenantId,
      name: session.tenantName,
      slug: session.tenantSlug,
    },
    canExportAudit: session.user.role === "admin" || session.user.role === "manager",
  };

  return <SettingsPage {...viewModel} />;
}
