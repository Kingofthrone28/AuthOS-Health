import { PrismaClient } from "@prisma/client";
import { AuditService } from "../auditService.js";
import { CaseService } from "../caseService.js";
import { SubmissionService } from "../submissionService.js";

const prisma = new PrismaClient();

let auditService: AuditService;
let caseService: CaseService;
let submissionService: SubmissionService;

const TENANT_ID = `test-sub-${Date.now()}`;

beforeAll(async () => {
  auditService = new AuditService(prisma);
  caseService = new CaseService(prisma, auditService);
  submissionService = new SubmissionService(prisma, auditService);

  await prisma.tenant.create({
    data: { id: TENANT_ID, name: "Test Sub Org", slug: `test-sub-${Date.now()}` },
  });
});

afterAll(async () => {
  await prisma.payerResponse.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.submission.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.auditEvent.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationRequirement.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.attachment.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationCase.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.patientRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.coverageRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.delete({ where: { id: TENANT_ID } });
  await prisma.$disconnect();
});

async function seedCaseInStatus(status: string) {
  const patient = await prisma.patientRef.create({
    data: {
      tenantId: TENANT_ID,
      fhirId: `fhir-p-${Date.now()}-${Math.random()}`,
      name: "Sub Test Patient",
      dob: "1985-06-15",
    },
  });
  const coverage = await prisma.coverageRef.create({
    data: {
      tenantId: TENANT_ID,
      patientRefId: patient.id,
      payerName: "TestPayer",
      memberId: `MBR-${Date.now()}`,
      payerId: "PAYER-001",
    },
  });

  const authCase = await caseService.createCase(TENANT_ID, {
    patientRefId: patient.id,
    coverageRefId: coverage.id,
    serviceType: "MRI Brain",
    serviceCode: "70553",
    priority: "standard",
    payerName: "TestPayer",
    createdBy: "test-user",
    orderRefId: undefined,
  });

  // Transition to the desired status
  if (status === "ready_to_submit") {
    await caseService.updateStatus(TENANT_ID, authCase.id, "requirements_found", "test");
    await caseService.updateStatus(TENANT_ID, authCase.id, "ready_to_submit", "test");
  }

  return authCase.id;
}

describe("SubmissionService", () => {
  describe("buildPacket", () => {
    it("builds a packet for a ready_to_submit case", async () => {
      const caseId = await seedCaseInStatus("ready_to_submit");
      const packet = await submissionService.buildPacket(TENANT_ID, caseId);

      expect(packet.caseId).toBe(caseId);
      expect(packet.protocol).toBe("portal");
      expect(packet.serviceCode).toBe("70553");
      expect(packet.tenantId).toBe(TENANT_ID);
    });

    it("rejects a case not in ready_to_submit status", async () => {
      const caseId = await seedCaseInStatus("new");
      await expect(
        submissionService.buildPacket(TENANT_ID, caseId)
      ).rejects.toThrow(/must be 'ready_to_submit'/);
    });
  });

  describe("listSubmissions", () => {
    it("returns empty list for case with no submissions", async () => {
      const caseId = await seedCaseInStatus("ready_to_submit");
      const submissions = await submissionService.listSubmissions(TENANT_ID, caseId);
      expect(submissions).toHaveLength(0);
    });
  });
});
