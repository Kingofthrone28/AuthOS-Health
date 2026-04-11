import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = `test-sla-${Date.now()}`;

beforeAll(async () => {
  await prisma.tenant.create({
    data: { id: TENANT_ID, name: "SLA Test Org", slug: `test-sla-${Date.now()}` },
  });
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

async function seedCase(dueAt: Date, status: string) {
  const patient = await prisma.patientRef.create({
    data: {
      tenantId: TENANT_ID,
      fhirId: `sla-p-${Date.now()}-${Math.random()}`,
      name: "SLA Patient",
      dob: "1988-01-01",
    },
  });
  const coverage = await prisma.coverageRef.create({
    data: {
      tenantId: TENANT_ID,
      patientRefId: patient.id,
      payerName: "SLAPayer",
      memberId: `SLA-${Date.now()}`,
    },
  });

  return prisma.authorizationCase.create({
    data: {
      tenantId: TENANT_ID,
      patientRefId: patient.id,
      coverageRefId: coverage.id,
      serviceType: "Test Service",
      priority: "standard",
      status: status as never,
      payerName: "SLAPayer",
      createdBy: "test",
      dueAt,
    },
  });
}

describe("SLA Processor - data queries", () => {
  it("identifies cases with breached SLA (dueAt in the past)", async () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const breachedCase = await seedCase(pastDue, "pending_payer");

    // Query the same way slaProcessor does
    const activeCases = await prisma.authorizationCase.findMany({
      where: {
        tenantId: TENANT_ID,
        status: { notIn: ["approved", "denied", "closed"] },
        dueAt: { not: null },
      },
    });

    const found = activeCases.find((c) => c.id === breachedCase.id);
    expect(found).toBeDefined();
    expect(found!.dueAt!.getTime()).toBeLessThan(Date.now());
  });

  it("does not pick up terminal cases", async () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await seedCase(pastDue, "approved");

    const activeCases = await prisma.authorizationCase.findMany({
      where: {
        tenantId: TENANT_ID,
        status: { notIn: ["approved", "denied", "closed"] },
        dueAt: { not: null },
      },
    });

    expect(activeCases.every((c) => !["approved", "denied", "closed"].includes(c.status))).toBe(true);
  });
});
