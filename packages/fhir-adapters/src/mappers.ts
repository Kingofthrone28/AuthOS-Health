import type { PatientRef, CoverageRef, OrderRef, EncounterRef } from "@authos/shared-types";
import type { FhirPatient, FhirCoverage, FhirServiceRequest, FhirEncounter } from "./types.js";

export function mapFhirPatient(resource: FhirPatient, tenantId: string): Omit<PatientRef, "id"> {
  const nameEntry = resource.name?.[0];
  const given = nameEntry?.given?.join(" ") ?? "";
  const family = nameEntry?.family ?? "";
  const mrn = resource.identifier?.find((i) => i.system?.includes("mrn"))?.value;

  return {
    tenantId,
    fhirId: resource.id,
    mrn,
    name: [given, family].filter(Boolean).join(" "),
    dob: resource.birthDate ?? "",
    gender: resource.gender,
  };
}

export function mapFhirCoverage(
  resource: FhirCoverage,
  tenantId: string,
  patientRefId: string
): Omit<CoverageRef, "id"> {
  const payorEntry = resource.payor?.[0];
  const planClass = resource.class?.find((c) =>
    c.type.coding.some((code) => code.code === "plan")
  );

  return {
    tenantId,
    patientRefId,
    payerName: payorEntry?.display ?? "",
    payerId: payorEntry?.reference,
    planName: planClass?.name,
    memberId: resource.subscriberId ?? "",
    groupId: planClass?.value,
  };
}

export function mapFhirServiceRequest(
  resource: FhirServiceRequest,
  tenantId: string,
  patientRefId: string
): Omit<OrderRef, "id"> {
  const coding = resource.code?.coding?.[0];

  return {
    tenantId,
    fhirId: resource.id,
    patientRefId,
    serviceType: coding?.display ?? coding?.code ?? "",
    serviceCode: coding?.code,
    orderingProviderRefId: undefined,
    requestedAt: resource.authoredOn ? new Date(resource.authoredOn) : new Date(),
  };
}

export function mapFhirEncounter(
  resource: FhirEncounter,
  tenantId: string,
  patientRefId: string
): Omit<EncounterRef, "id"> {
  return {
    tenantId,
    fhirId: resource.id,
    patientRefId,
    date: resource.period?.start ?? "",
  };
}
