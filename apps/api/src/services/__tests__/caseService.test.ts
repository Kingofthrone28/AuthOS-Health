import { PrismaClient } from "@prisma/client";
import { AuditService } from "../auditService.js";
import { CaseService } from "../caseService.js";
import { InvalidTransitionError } from "@authos/domain";

// Uses real test database — set DATABASE_URL in .env.test
const prisma = new PrismaClient();

let auditService: AuditService;
let caseService: CaseService;

// Synthetic tenant and reference IDs — created fresh each run
const TENANT_ID = `test-tenant-${Date.now()}`;

beforeAll(async () => {
  auditService = new AuditService(prisma);
  caseService  = new CaseService(prisma, auditService);

  // Seed required tenant and reference rows
  await prisma.tenant.create({ data: { id: TENANT_ID, name: "Test Org", slug: `test-${Date.now()}` } });
});

afterAll(async () => {
  // Clean up test data in dependency order
  await prisma.auditEvent.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationRequirement.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.attachment.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationCase.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.patientRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.coverageRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.delete({ where: { id: TENANT_ID } });
  await prisma.$disconnect();
});

async function seedRefs() {
  const patient = await prisma.patientRef.create({
    data: {
      tenantId: TENANT_ID,
      fhirId:   `fhir-patient-${Date.now()}`,
      name:     "Synthetic Patient",
      dob:      "1980-01-01",
    },
  });
  const coverage = await prisma.coverageRef.create({
    data: {
      tenantId:     TENANT_ID,
      patientRefId: patient.id,
      payerName:    "Test Payer",
      memberId:     `MBR-${Date.now()}`,
    },
  });
  return { patient, coverage };
}

describe("CaseService", () => {
  describe("createCase", () => {
    it("creates a case with status=new and emits a CASE_CREATED audit event", async () => {
      const { patient, coverage } = await seedRefs();

      const authCase = await caseService.createCase(TENANT_ID, {
        patientRefId:  patient.id,
        coverageRefId: coverage.id,
        serviceType:   "MRI Brain",
        serviceCode:   "MRI",
        priority:      "expedited",
        payerName:     "Test Payer",
        createdBy:     "user-test",
        orderRefId:    undefined,
      });

      expect(authCase.status).toBe("new");
      expect(authCase.tenantId).toBe(TENANT_ID);
      expect(authCase.dueAt).not.toBeNull();

      const audit = await prisma.auditEvent.findFirst({
        where: { entityId: authCase.id, action: "case.created" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe("user-test");
    });
  });

  describe("updateStatus", () => {
    it("allows a valid transition and emits CASE_STATUS_CHANGED", async () => {
      const { patient, coverage } = await seedRefs();
      const authCase = await caseService.createCase(TENANT_ID, {
        patientRefId:  patient.id,
        coverageRefId: coverage.id,
        serviceType:   "CT Chest",
        priority:      "standard",
        payerName:     "Test Payer",
        createdBy:     "user-test",
        orderRefId:    undefined,
        serviceCode:   undefined,
      });

      const updated = await caseService.updateStatus(TENANT_ID, authCase.id, "requirements_found", "user-test");
      expect(updated.status).toBe("requirements_found");

      const audit = await prisma.auditEvent.findFirst({
        where: { entityId: authCase.id, action: "case.status_changed" },
        orderBy: { occurredAt: "desc" },
      });
      expect(audit).not.toBeNull();
    });

    it("rejects an invalid transition with InvalidTransitionError", async () => {
      const { patient, coverage } = await seedRefs();
      const authCase = await caseService.createCase(TENANT_ID, {
        patientRefId:  patient.id,
        coverageRefId: coverage.id,
        serviceType:   "PT Shoulder",
        priority:      "standard",
        payerName:     "Test Payer",
        createdBy:     "user-test",
        orderRefId:    undefined,
        serviceCode:   undefined,
      });

      // "new" → "approved" is not a valid transition
      await expect(
        caseService.updateStatus(TENANT_ID, authCase.id, "approved", "user-test")
      ).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe("listCases", () => {
    it("filters by status", async () => {
      const { patient, coverage } = await seedRefs();
      await caseService.createCase(TENANT_ID, {
        patientRefId:  patient.id,
        coverageRefId: coverage.id,
        serviceType:   "Cardiac Cath",
        priority:      "urgent",
        payerName:     "Cigna",
        createdBy:     "user-test",
        orderRefId:    undefined,
        serviceCode:   undefined,
      });

      const results = await caseService.listCases(TENANT_ID, { status: "new", assignedTo: undefined, q: undefined });
      expect(results.every((c) => c.status === "new")).toBe(true);
    });

    it("scopes results to the tenant", async () => {
      const results = await caseService.listCases("other-tenant-id", { status: undefined, assignedTo: undefined, q: undefined });
      expect(results).toHaveLength(0);
    });
  });
});
