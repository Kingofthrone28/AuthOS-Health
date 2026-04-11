// Core reference entities

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  settings?: TenantSettings;
}

export type SsoProvider = "oidc" | "saml";

export interface TenantSettings {
  id: string;
  tenantId: string;
  ssoProvider?: SsoProvider;
  ssoIssuerUrl?: string;
  ssoClientId?: string;
  ssoClientSecret?: string;
  fhirServerUrl?: string;
  payerEndpoint?: string;
  retentionDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash?: string;
  createdAt: Date;
}

export type UserRole = "admin" | "clinician" | "auth_specialist" | "manager" | "read_only";

// Healthcare reference entities — internal canonical schema, not raw FHIR

export interface PatientRef {
  id: string;
  tenantId: string;
  fhirId: string;
  mrn: string | undefined;
  name: string;
  dob: string; // ISO date
  gender: string | undefined;
}

export interface CoverageRef {
  id: string;
  tenantId: string;
  patientRefId: string;
  payerName: string;
  payerId: string | undefined;
  planName: string | undefined;
  memberId: string;
  groupId: string | undefined;
}

export interface ProviderRef {
  id: string;
  tenantId: string;
  fhirId: string;
  npi: string | undefined;
  name: string;
}

export interface EncounterRef {
  id: string;
  tenantId: string;
  fhirId: string;
  patientRefId: string;
  date: string;
}

export interface OrderRef {
  id: string;
  tenantId: string;
  fhirId: string;
  patientRefId: string;
  serviceType: string;
  serviceCode: string | undefined;
  orderingProviderRefId: string | undefined;
  requestedAt: Date;
}
