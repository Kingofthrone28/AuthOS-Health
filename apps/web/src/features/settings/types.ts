export interface SettingsViewModel {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  canExportAudit: boolean;
}
