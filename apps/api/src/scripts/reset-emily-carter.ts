/**
 * Reset Emily Carter's case data for dynamic flow testing.
 *
 * Deletes all case-related records for Emily Carter and re-seeds her
 * in `new` status so you can walk through the full authorization flow.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authos_health \
 *   npx tsx apps/api/src/scripts/reset-emily-carter.ts
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

  const patient = await db.patientRef.findUnique({
    where: { tenantId_fhirId: { tenantId: tid, fhirId: "pt-fhir-008" } },
  });

  if (!patient) {
    console.log("Emily Carter patient record not found — running full seed instead.");
    console.log("Run: npx tsx apps/api/src/scripts/seed-sample-data.ts");
    process.exit(0);
  }

  console.log(`Found Emily Carter (${patient.id}). Resetting her case data...`);

  // Find her case via the order
  const order = await db.orderRef.findUnique({
    where: { tenantId_fhirId: { tenantId: tid, fhirId: "ord-fhir-008" } },
  });

  if (order) {
    const existingCase = await db.authorizationCase.findFirst({
      where: { tenantId: tid, patientRefId: patient.id, orderRefId: order.id },
    });

    if (existingCase) {
      const caseId = existingCase.id;
      console.log(`  Deleting case ${caseId} and all related records...`);

      // Delete in dependency order
      await db.payerResponse.deleteMany({ where: { caseId, tenantId: tid } });
      await db.submission.deleteMany({ where: { caseId, tenantId: tid } });
      await db.authorizationRequirement.deleteMany({ where: { caseId, tenantId: tid } });
      await db.task.deleteMany({ where: { caseId, tenantId: tid } });
      await db.attachment.deleteMany({ where: { caseId, tenantId: tid } });
      await db.extractedEvent.deleteMany({ where: { caseId, tenantId: tid } });
      await db.auditEvent.deleteMany({ where: { tenantId: tid, entityType: "AuthorizationCase", entityId: caseId } });
      await db.authorizationCase.delete({ where: { id: caseId } });

      console.log("  Deleted.");
    }
  }

  // Re-create in fresh `new` state
  const adminUser = await db.user.findFirst({ where: { tenantId: tid, role: "admin" } });
  const userId = adminUser?.id ?? "system";

  const coverage = await db.coverageRef.findFirst({
    where: { tenantId: tid, fhirId: "cov-fhir-008" },
  });

  const freshOrder = await db.orderRef.upsert({
    where:  { tenantId_fhirId: { tenantId: tid, fhirId: "ord-fhir-008" } },
    create: { tenantId: tid, fhirId: "ord-fhir-008", patientRefId: patient.id, serviceType: "Sleep Study", serviceCode: "95810", orderingProviderRefId: userId, requestedAt: new Date() },
    update: {},
  });

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 14);

  const newCase = await db.authorizationCase.create({
    data: {
      tenantId:     tid,
      patientRefId: patient.id,
      coverageRefId: coverage!.id,
      orderRefId:   freshOrder.id,
      serviceType:  "Polysomnography Sleep Study",
      serviceCode:  "95810",
      priority:     "standard",
      status:       "new",
      payerName:    "UnitedHealth",
      createdBy:    userId,
      assignedTo:   userId,
      dueAt,
    },
  });

  await db.task.create({
    data: {
      tenantId:   tid,
      caseId:     newCase.id,
      type:       "review",
      description: "Review case details and initiate requirements check",
      assignedTo: userId,
      status:     "open",
      dueAt,
    },
  });

  await db.auditEvent.create({
    data: {
      tenantId:   tid,
      entityType: "AuthorizationCase",
      entityId:   newCase.id,
      action:     "case.created",
      actorId:    userId,
      after:      { status: "new", service: "Polysomnography Sleep Study" },
      occurredAt: new Date(),
    },
  });

  console.log(`\nEmily Carter reset complete.`);
  console.log(`  Case ID : ${newCase.id}`);
  console.log(`  Status  : new`);
  console.log(`  Service : Polysomnography Sleep Study (95810)`);
  console.log(`  Payer   : UnitedHealth — Navigate HMO`);
  console.log(`  Due     : ${dueAt.toDateString()}`);
  console.log(`\nYou can now walk through: new → requirements_found → docs_missing → ready_to_submit → submitted → ...`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
