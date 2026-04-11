import { PrismaClient } from "@prisma/client";
import { AnalyticsService } from "../analyticsService.js";

const prisma = new PrismaClient();
let analyticsService: AnalyticsService;

const TENANT_ID = `test-analytics-${Date.now()}`;

beforeAll(async () => {
  analyticsService = new AnalyticsService(prisma);

  await prisma.tenant.create({
    data: { id: TENANT_ID, name: "Analytics Org", slug: `test-analytics-${Date.now()}` },
  });

  // Seed reference data
  const patient = await prisma.patientRef.create({
    data: {
      tenantId: TENANT_ID,
      fhirId: `fhir-ana-${Date.now()}`,
      name: "Analytics Patient",
      dob: "1975-03-20",
    },
  });
  const coverage = await prisma.coverageRef.create({
    data: {
      tenantId: TENANT_ID,
      patientRefId: patient.id,
      payerName: "Aetna",
      memberId: `MBR-ANA-${Date.now()}`,
    },
  });

  // Seed cases with different statuses
  await prisma.authorizationCase.createMany({
    data: [
      {
        tenantId: TENANT_ID,
        patientRefId: patient.id,
        coverageRefId: coverage.id,
        serviceType: "MRI",
        priority: "standard",
        status: "approved",
        payerName: "Aetna",
        createdBy: "user-1",
        assignedTo: "staff-1",
      },
      {
        tenantId: TENANT_ID,
        patientRefId: patient.id,
        coverageRefId: coverage.id,
        serviceType: "CT Scan",
        priority: "expedited",
        status: "denied",
        payerName: "Aetna",
        createdBy: "user-1",
        assignedTo: "staff-2",
      },
      {
        tenantId: TENANT_ID,
        patientRefId: patient.id,
        coverageRefId: coverage.id,
        serviceType: "PT",
        priority: "standard",
        status: "pending_payer",
        payerName: "Aetna",
        createdBy: "user-1",
        assignedTo: "staff-1",
      },
    ],
  });
});

afterAll(async () => {
  await prisma.payerResponse.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.submission.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.auditEvent.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationCase.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.patientRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.coverageRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.delete({ where: { id: TENANT_ID } });
  await prisma.$disconnect();
});

describe("AnalyticsService", () => {
  it("returns turnaround metrics with status distribution", async () => {
    const result = await analyticsService.turnaroundMetrics(TENANT_ID);
    expect(result.metric).toBe("turnaround");
    expect(result.data.statusDistribution.length).toBeGreaterThan(0);

    const approvedCount = result.data.statusDistribution.find((s) => s.status === "approved");
    expect(approvedCount?.count).toBe(1);
  });

  it("returns denial metrics", async () => {
    const result = await analyticsService.denialMetrics(TENANT_ID);
    expect(result.metric).toBe("denials");
    expect(result.data.deniedCount).toBe(1);
    expect(result.data.totalCases).toBe(3);
  });

  it("returns payer metrics", async () => {
    const result = await analyticsService.payerMetrics(TENANT_ID);
    expect(result.metric).toBe("payers");
    // May be empty if no PayerResponse rows exist (no submissions yet)
    expect(result.data).toBeDefined();
  });

  it("returns staff metrics", async () => {
    const result = await analyticsService.staffMetrics(TENANT_ID);
    expect(result.metric).toBe("staff");
    expect(result.data.length).toBe(2); // staff-1 and staff-2

    const staff1 = result.data.find((s) => s.staffId === "staff-1");
    expect(staff1?.activeCases).toBe(2);
  });
});
