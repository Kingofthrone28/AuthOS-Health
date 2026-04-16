import { User, Building2, Shield, FileDown } from "lucide-react";
import type { SettingsViewModel } from "../types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  clinician: "Clinician",
  auth_specialist: "Auth Specialist",
  read_only: "Read Only",
};

export function SettingsPage({ user, tenant, canExportAudit }: SettingsViewModel) {
  const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <User size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Profile</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
          <Field label="Name" value={user.name} />
          <Field label="Email" value={user.email} />
          <Field label="Role" value={ROLE_LABELS[user.role] ?? user.role} />
          <Field label="User ID" value={user.id} mono />
        </div>
      </section>

      {/* Organization */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building2 size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Organization</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
          <Field label="Name" value={tenant.name} />
          <Field label="Slug" value={tenant.slug} mono />
          <Field label="Tenant ID" value={tenant.id} mono />
        </div>
      </section>

      {/* Security */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Security</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-500">
            SSO configuration and password management are managed by your organization administrator.
          </p>
        </div>
      </section>

      {/* Audit exports */}
      {canExportAudit && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <FileDown size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Audit Exports</h2>
          </div>
          <div className="px-6 py-5 flex flex-col sm:flex-row gap-3">
            <a
              href={`${API_URL}/api/audit/export/csv`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileDown size={15} />
              Download CSV
            </a>
            <a
              href={`${API_URL}/api/audit/export/json`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileDown size={15} />
              Download NDJSON
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</dt>
      <dd className={`text-sm text-gray-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
