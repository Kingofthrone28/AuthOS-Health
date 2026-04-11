import { PrismaClient } from "@prisma/client";
import { AuditService } from "../auditService.js";
import { CaseService } from "../caseService.js";
import { TaskService } from "../taskService.js";

const prisma = new PrismaClient();

let auditService: AuditService;
let caseService: CaseService;
let taskService: TaskService;

const TENANT_ID = `test-task-${Date.now()}`;
let testCaseId: string;

beforeAll(async () => {
  auditService = new AuditService(prisma);
  caseService = new CaseService(prisma, auditService);
  taskService = new TaskService(prisma, auditService);

  await prisma.tenant.create({
    data: { id: TENANT_ID, name: "Test Task Org", slug: `test-task-${Date.now()}` },
  });

  const patient = await prisma.patientRef.create({
    data: {
      tenantId: TENANT_ID,
      fhirId: `fhir-task-${Date.now()}`,
      name: "Task Test Patient",
      dob: "1990-01-01",
    },
  });
  const coverage = await prisma.coverageRef.create({
    data: {
      tenantId: TENANT_ID,
      patientRefId: patient.id,
      payerName: "TaskPayer",
      memberId: `MBR-TASK-${Date.now()}`,
    },
  });

  const authCase = await caseService.createCase(TENANT_ID, {
    patientRefId: patient.id,
    coverageRefId: coverage.id,
    serviceType: "CT Scan",
    priority: "standard",
    payerName: "TaskPayer",
    createdBy: "test-user",
    orderRefId: undefined,
    serviceCode: undefined,
  });
  testCaseId = authCase.id;
});

afterAll(async () => {
  await prisma.task.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.auditEvent.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationCase.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.patientRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.coverageRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.delete({ where: { id: TENANT_ID } });
  await prisma.$disconnect();
});

describe("TaskService", () => {
  it("creates a task and emits TASK_CREATED audit", async () => {
    const task = await taskService.createTask(TENANT_ID, {
      caseId: testCaseId,
      type: "sla_breach",
      description: "SLA breached for this case",
    });

    expect(task.type).toBe("sla_breach");
    expect(task.status).toBe("open");
    expect(task.tenantId).toBe(TENANT_ID);

    const audit = await prisma.auditEvent.findFirst({
      where: { entityId: task.id, action: "task.created" },
    });
    expect(audit).not.toBeNull();
  });

  it("lists tasks filtered by status", async () => {
    const tasks = await taskService.listTasks(TENANT_ID, { status: "open" });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.status === "open")).toBe(true);
  });

  it("completes a task and emits TASK_COMPLETED audit", async () => {
    const task = await taskService.createTask(TENANT_ID, {
      caseId: testCaseId,
      type: "follow_up",
      description: "Follow up with payer",
    });

    const completed = await taskService.completeTask(TENANT_ID, task.id, "reviewer-1");
    expect(completed.status).toBe("completed");
    expect(completed.completedBy).toBe("reviewer-1");
    expect(completed.completedAt).not.toBeNull();

    const audit = await prisma.auditEvent.findFirst({
      where: { entityId: task.id, action: "task.completed" },
    });
    expect(audit).not.toBeNull();
  });

  it("cancels a task", async () => {
    const task = await taskService.createTask(TENANT_ID, {
      caseId: testCaseId,
      type: "redundant",
      description: "This task will be cancelled",
    });

    const cancelled = await taskService.cancelTask(TENANT_ID, task.id);
    expect(cancelled.status).toBe("cancelled");
  });
});
