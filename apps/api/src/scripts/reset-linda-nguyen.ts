/**
 * Reset Linda Nguyen's case to `docs_missing` for end-to-end flow testing.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authos_health \
 *   npx tsx apps/api/src/scripts/reset-linda-nguyen.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tenant = await db.tenant.findUnique({ where: { slug: "dev" } });
  if (!tenant) {
    console.error('Tenant "dev" not found. Run bootstrap-tenant.ts first.');
    process.exit(1);
  }

  const tid = tenant.id;
  const adminUser = await db.user.findFirst({ where: { tenantId: tid, role: "admin" } });
  const userId = adminUser?.id ?? "system";

  const patient = await db.patientRef.findUnique({
    where: { tenantId_fhirId: { tenantId: tid, fhirId: "pt-fhir-007" } },
  });

  if (!patient) {
    console.error("Linda Nguyen patient record not found. Run seed-sample-data.ts first.");
    process.exit(1);
  }

  console.log(`Found Linda Nguyen (${patient.id}). Resetting her case data...`);

  const order = await db.orderRef.findUnique({
    where: { tenantId_fhirId: { tenantId: tid, fhirId: "ord-fhir-007" } },
  });

  if (order) {
    const existingCase = await db.authorizationCase.findFirst({
      where: { tenantId: tid, patientRefId: patient.id, orderRefId: order.id },
    });

    if (existingCase) {
      const caseId = existingCase.id;
      console.log(`  Deleting case ${caseId} and all related records...`);

      await db.payerResponse.deleteMany({ where: { caseId, tenantId: tid } });
      await db.submission.deleteMany({ where: { caseId, tenantId: tid } });
      await db.authorizationRequirement.deleteMany({ where: { caseId, tenantId: tid } });
      await db.task.deleteMany({ where: { caseId, tenantId: tid } });
      await db.attachment.deleteMany({ where: { caseId, tenantId: tid } });
      await db.extractedEvent.deleteMany({ where: { caseId, tenantId: tid } });
      await db.auditEvent.deleteMany({
        where: { tenantId: tid, entityType: "AuthorizationCase", entityId: caseId },
      });
      await db.authorizationCase.delete({ where: { id: caseId } });
      console.log("  Deleted.");
    }
  }

  const coverage = await db.coverageRef.findFirst({
    where: { tenantId: tid, fhirId: "cov-fhir-007" },
  });

  const freshOrder = await db.orderRef.upsert({
    where:  { tenantId_fhirId: { tenantId: tid, fhirId: "ord-fhir-007" } },
    create: { tenantId: tid, fhirId: "ord-fhir-007", patientRefId: patient.id, serviceType: "Cardiac Cath", serviceCode: "93510", orderingProviderRefId: userId, requestedAt: new Date() },
    update: {},
  });

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 1); // urgent

  const newCase = await db.authorizationCase.create({
    data: {
      tenantId:      tid,
      patientRefId:  patient.id,
      coverageRefId: coverage?.id ?? null,
      orderRefId:    freshOrder.id,
      serviceType:   "Cardiac Catheterization",
      serviceCode:   "93510",
      priority:      "urgent",
      status:        "docs_missing",
      payerName:     "Cigna",
      createdBy:     userId,
      assignedTo:    userId,
      dueAt,
    },
  });

  // Seed realistic CATH requirements — both open so the full upload→complete flow can be tested
  await db.authorizationRequirement.createMany({
    data: [
      { caseId: newCase.id, tenantId: tid, description: "Cardiology consult notes",                   source: "crd", required: true,  completed: false },
      { caseId: newCase.id, tenantId: tid, description: "Stress test or non-invasive cardiac workup", source: "crd", required: true,  completed: false },
      { caseId: newCase.id, tenantId: tid, description: "Supporting ICD-10 diagnosis codes",          source: "crd", required: true,  completed: false },
    ],
  });

  // Collect tasks — one per open requirement
  await db.task.createMany({
    data: [
      { tenantId: tid, caseId: newCase.id, type: "collect", description: "Obtain cardiology consult notes from attending cardiologist", assignedTo: userId, status: "open", dueAt },
      { tenantId: tid, caseId: newCase.id, type: "collect", description: "Collect stress test results or non-invasive cardiac workup report", assignedTo: userId, status: "open", dueAt },
    ],
  });

  await db.auditEvent.create({
    data: {
      tenantId:   tid,
      entityType: "AuthorizationCase",
      entityId:   newCase.id,
      action:     "case.created",
      actorId:    userId,
      after:      { status: "docs_missing", service: "Cardiac Catheterization" },
      occurredAt: new Date(),
    },
  });

  console.log(`\nLinda Nguyen reset complete.`);
  console.log(`  Case ID      : ${newCase.id}`);
  console.log(`  Status       : docs_missing`);
  console.log(`  Service      : Cardiac Catheterization (93510)`);
  console.log(`  Payer        : Cigna — Open Access`);
  console.log(`  Priority     : urgent (due ${dueAt.toDateString()})`);
  console.log(`  Requirements : 3 open (cardiology notes, stress test, ICD-10 codes)`);
  console.log(`\nTest flow: attach files per requirement → each auto-completes → all 3 done → case transitions to ready_to_submit`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
