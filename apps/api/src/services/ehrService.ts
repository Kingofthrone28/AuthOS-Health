import type { PrismaClient } from "@prisma/client";
import {
  mapFhirPatient,
  mapFhirCoverage,
  mapFhirServiceRequest,
} from "@authos/fhir-adapters";
import type {
  FhirPatient,
  FhirCoverage,
  FhirServiceRequest,
} from "@authos/fhir-adapters";

interface FhirBundle<T> {
  entry?: Array<{ resource: T }>;
}

export class EhrService {
  constructor(private readonly db: PrismaClient) {}

  async fetchAndSyncContext(
    tenantId: string,
    fhirBaseUrl: string,
    accessToken: string,
    patientId: string
  ) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept:        "application/fhir+json",
    };

    const base = fhirBaseUrl.replace(/\/$/, "");

    const [patientRes, coverageRes, orderRes] = await Promise.all([
      fetch(`${base}/Patient/${patientId}`, { headers }).then((r) => r.json()),
      fetch(`${base}/Coverage?patient=${patientId}`, { headers }).then((r) => r.json()),
      fetch(`${base}/ServiceRequest?patient=${patientId}`, { headers }).then((r) => r.json()),
    ]);

    const fhirPatient  = patientRes as FhirPatient;
    const fhirCoverage = ((coverageRes as FhirBundle<FhirCoverage>).entry?.[0]?.resource) ?? null;
    const fhirOrder    = ((orderRes as FhirBundle<FhirServiceRequest>).entry?.[0]?.resource) ?? null;

    // Upsert PatientRef by tenantId + fhirId
    const mappedPatient = mapFhirPatient(fhirPatient, tenantId);
    const patientData = {
      tenantId:  mappedPatient.tenantId,
      fhirId:    mappedPatient.fhirId,
      name:      mappedPatient.name,
      dob:       mappedPatient.dob,
      gender:    mappedPatient.gender   ?? null,
      mrn:       mappedPatient.mrn      ?? null,
    };
    const patientRef  = await this.db.patientRef.upsert({
      where:  { tenantId_fhirId: { tenantId, fhirId: fhirPatient.id } },
      update: patientData,
      create: patientData,
    });

    // Upsert CoverageRef by tenantId + fhirId (fhirId may be null for non-FHIR coverage)
    let coverageRefId: string | undefined;
    if (fhirCoverage) {
      const mapped = mapFhirCoverage(fhirCoverage, tenantId, patientRef.id);
      const coverageData = {
        fhirId:      fhirCoverage.id,
        tenantId,
        patientRefId: patientRef.id,
        payerName:   mapped.payerName,
        payerId:     mapped.payerId   ?? null,
        planName:    mapped.planName  ?? null,
        memberId:    mapped.memberId,
        groupId:     mapped.groupId   ?? null,
      };
      const existingCoverage = await this.db.coverageRef.findFirst({
        where: { tenantId, fhirId: fhirCoverage.id },
      });

      const coverageRef = existingCoverage
        ? await this.db.coverageRef.update({
            where: { id: existingCoverage.id },
            data:  coverageData,
          })
        : await this.db.coverageRef.create({ data: coverageData });

      coverageRefId = coverageRef.id;
    }

    // Upsert OrderRef by tenantId + fhirId
    let orderRefId: string | undefined;
    if (fhirOrder) {
      const mapped = mapFhirServiceRequest(fhirOrder, tenantId, patientRef.id);
      const orderData = {
        tenantId,
        fhirId:               fhirOrder.id,
        patientRefId:         patientRef.id,
        serviceType:          mapped.serviceType,
        serviceCode:          mapped.serviceCode          ?? null,
        orderingProviderRefId: mapped.orderingProviderRefId ?? null,
        requestedAt:          mapped.requestedAt,
      };
      const orderRef = await this.db.orderRef.upsert({
        where:  { tenantId_fhirId: { tenantId, fhirId: fhirOrder.id } },
        update: orderData,
        create: orderData,
      });
      orderRefId = orderRef.id;
    }

    // Reload for return so callers have the full records
    const [orderRef, coverageRef] = await Promise.all([
      orderRefId    ? this.db.orderRef.findUnique({ where: { id: orderRefId } })       : Promise.resolve(null),
      coverageRefId ? this.db.coverageRef.findUnique({ where: { id: coverageRefId } }) : Promise.resolve(null),
    ]);

    return { patientRef, coverageRefId, orderRefId, orderRef, coverageRef };
  }
}
