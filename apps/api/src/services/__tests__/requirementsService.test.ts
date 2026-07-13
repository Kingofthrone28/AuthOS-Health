import { PrismaClient } from "@prisma/client";
import { AuditService } from "../auditService.js";
import { CaseService } from "../caseService.js";
import { RequirementsService } from "../requirementsService.js";

const prisma = new PrismaClient();
const TENANT_ID = `test-requirements-${Date.now()}`;

let caseId: string;
let firstRequirementId: string;
let secondRequirementId: string;
let firstTaskId: string;
let secondTaskId: string;
let requirementsService: RequirementsService;
let caseService: CaseService;

beforeAll(async () => {
  const audit = new AuditService(prisma);
  requirementsService = new RequirementsService(prisma, audit);
  caseService = new CaseService(prisma, audit);

  await prisma.tenant.create({
    data: { id: TENANT_ID, name: "Requirements Test Org", slug: `requirements-${Date.now()}` },
  });
  const patient = await prisma.patientRef.create({
    data: {
      tenantId: TENANT_ID,
      fhirId: `requirements-patient-${Date.now()}`,
      name: "Synthetic Requirements Patient",
      dob: "1985-04-12",
    },
  });
  const coverage = await prisma.coverageRef.create({
    data: {
      tenantId: TENANT_ID,
      patientRefId: patient.id,
      payerName: "Requirements Payer",
      memberId: `REQ-${Date.now()}`,
    },
  });
  const authCase = await prisma.authorizationCase.create({
    data: {
      tenantId: TENANT_ID,
      patientRefId: patient.id,
      coverageRefId: coverage.id,
      serviceType: "Cardiac test",
      priority: "urgent",
      status: "docs_missing",
      payerName: "Requirements Payer",
      createdBy: "test-user",
    },
  });
  caseId = authCase.id;

  const [firstRequirement, secondRequirement] = await Promise.all([
    prisma.authorizationRequirement.create({
      data: { tenantId: TENANT_ID, caseId, description: "Consult notes", required: true },
    }),
    prisma.authorizationRequirement.create({
      data: { tenantId: TENANT_ID, caseId, description: "Stress test", required: true },
    }),
  ]);
  firstRequirementId = firstRequirement.id;
  secondRequirementId = secondRequirement.id;

  const [firstTask, secondTask] = await Promise.all([
    prisma.task.create({
      data: {
        tenantId: TENANT_ID,
        caseId,
        requirementId: firstRequirementId,
        type: "collect",
        description: "Collect consult notes",
      },
    }),
    prisma.task.create({
      data: {
        tenantId: TENANT_ID,
        caseId,
        requirementId: secondRequirementId,
        type: "collect",
        description: "Collect stress test",
      },
    }),
  ]);
  firstTaskId = firstTask.id;
  secondTaskId = secondTask.id;
});

afterAll(async () => {
  await prisma.task.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.auditEvent.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationRequirement.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationCase.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.patientRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.coverageRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.delete({ where: { id: TENANT_ID } });
  await prisma.$disconnect();
});

describe("RequirementsService.completeRequirement", () => {
  it("completes only the task linked to each requirement and advances when all are done", async () => {
    await requirementsService.completeRequirement(
      TENANT_ID,
      caseId,
      firstRequirementId,
      "reviewer-1",
    );

    const [firstTask, secondTask, caseAfterFirst] = await Promise.all([
      prisma.task.findUniqueOrThrow({ where: { id: firstTaskId } }),
      prisma.task.findUniqueOrThrow({ where: { id: secondTaskId } }),
      caseService.getCase(TENANT_ID, caseId),
    ]);
    expect(firstTask.status).toBe("completed");
    expect(firstTask.completedBy).toBe("reviewer-1");
    expect(secondTask.status).toBe("open");
    expect(caseAfterFirst?.status).toBe("docs_missing");
    expect(caseAfterFirst?.tasks.map((task) => task.id)).toEqual([secondTaskId]);

    await requirementsService.completeRequirement(
      TENANT_ID,
      caseId,
      secondRequirementId,
      "reviewer-1",
    );

    const [completedCase, taskAudit] = await Promise.all([
      caseService.getCase(TENANT_ID, caseId),
      prisma.auditEvent.findFirst({
        where: { tenantId: TENANT_ID, entityId: secondTaskId, action: "task.completed" },
      }),
    ]);
    expect(completedCase?.status).toBe("ready_to_submit");
    expect(completedCase?.tasks).toHaveLength(0);
    expect(taskAudit).not.toBeNull();
  });
});
