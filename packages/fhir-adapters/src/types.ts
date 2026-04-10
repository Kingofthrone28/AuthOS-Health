// Minimal FHIR R4 resource shapes for the fields AuthOS-Health needs.
// Not a full FHIR client — use an upstream FHIR server or EHR sandbox for the full spec.

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  identifier?: Array<{ system?: string; value?: string }>;
  name?: Array<{ family?: string; given?: string[] }>;
  birthDate?: string;
  gender?: string;
}

export interface FhirCoverage {
  resourceType: "Coverage";
  id: string;
  subscriber?: { reference?: string };
  beneficiary?: { reference?: string };
  payor?: Array<{ reference?: string; display?: string }>;
  class?: Array<{ type: { coding: Array<{ code: string }> }; value: string; name?: string }>;
  subscriberId?: string;
}

export interface FhirServiceRequest {
  resourceType: "ServiceRequest";
  id: string;
  subject?: { reference?: string };
  requester?: { reference?: string };
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
  authoredOn?: string;
}

export interface FhirEncounter {
  resourceType: "Encounter";
  id: string;
  subject?: { reference?: string };
  period?: { start?: string; end?: string };
}

// SMART launch context returned by the EHR at launch time.
export interface SmartLaunchContext {
  patient?: string;
  encounter?: string;
  intent?: string;
  iss: string;
  launch?: string;
}
