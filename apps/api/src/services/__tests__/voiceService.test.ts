import { PrismaClient } from "@prisma/client";
import { AuditService } from "../auditService.js";
import { VoiceService } from "../voiceService.js";

const prisma = new PrismaClient();

let auditService: AuditService;
let voiceService: VoiceService;

const TENANT_ID = `test-voice-${Date.now()}`;
let testCaseId: string;
let testTranscriptId: string;

async function seedEvent(
  eventType: string,
  value: string,
  confidence = 0.9
) {
  return prisma.extractedEvent.create({
    data: {
      tenantId:     TENANT_ID,
      transcriptId: testTranscriptId,
      caseId:       testCaseId,
      eventType:    eventType as never,
      value,
      confidence,
      reviewStatus: "pending",
      extractedAt:  new Date(),
    },
  });
}

beforeAll(async () => {
  auditService = new AuditService(prisma);
  voiceService = new VoiceService(prisma, auditService);

  await prisma.tenant.create({
    data: { id: TENANT_ID, name: "Test Voice Org", slug: `test-voice-${Date.now()}` },
  });

  const patient = await prisma.patientRef.create({
    data: {
      tenantId: TENANT_ID,
      fhirId:   `fhir-voice-${Date.now()}`,
      name:     "Voice Test Patient",
      dob:      "1980-06-15",
    },
  });

  const coverage = await prisma.coverageRef.create({
    data: {
      tenantId:     TENANT_ID,
      patientRefId: patient.id,
      payerName:    "VoicePayer",
      memberId:     `MBR-VOICE-${Date.now()}`,
    },
  });

  const authCase = await prisma.authorizationCase.create({
    data: {
      tenantId:     TENANT_ID,
      patientRefId: patient.id,
      coverageRefId: coverage.id,
      serviceType:  "MRI",
      priority:     "standard",
      status:       "pending_payer",
      payerName:    "VoicePayer",
      createdBy:    "test-setup",
    },
  });
  testCaseId = authCase.id;

  const transcript = await prisma.callTranscript.create({
    data: {
      tenantId:       TENANT_ID,
      caseId:         testCaseId,
      callSid:        `CA-voice-test-${Date.now()}`,
      direction:      "inbound",
      transcriptText: "Test transcript for voice service integration tests.",
      startedAt:      new Date(),
    },
  });
  testTranscriptId = transcript.id;
});

afterAll(async () => {
  await prisma.task.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.extractedEvent.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.callTranscript.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.auditEvent.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.authorizationCase.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.patientRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.coverageRef.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.delete({ where: { id: TENANT_ID } });
  await prisma.$disconnect();
});

describe("VoiceService.processReview auto-apply", () => {
  it("approved reference_number updates AuthorizationCase.payerCaseRef", async () => {
    const event = await seedEvent("reference_number", "REF-12345");

    await voiceService.processReview(TENANT_ID, event.id, "approved", "reviewer-1");

    const authCase = await prisma.authorizationCase.findUniqueOrThrow({
      where: { id: testCaseId },
    });
    expect(authCase.payerCaseRef).toBe("REF-12345");

    const audit = await prisma.auditEvent.findFirst({
      where: {
        tenantId:   TENANT_ID,
        entityId:   testCaseId,
        action:     "voice.event.applied_to_case",
      },
    });
    expect(audit).not.toBeNull();
    expect((audit!.after as Record<string, unknown>)["payerCaseRef"]).toBe("REF-12345");
  });

  it("approved approval_number updates AuthorizationCase.approvalNumber", async () => {
    const event = await seedEvent("approval_number", "AUTH-67890");

    await voiceService.processReview(TENANT_ID, event.id, "approved", "reviewer-1");

    const authCase = await prisma.authorizationCase.findUniqueOrThrow({
      where: { id: testCaseId },
    });
    expect(authCase.approvalNumber).toBe("AUTH-67890");

    const audit = await prisma.auditEvent.findFirst({
      where: {
        tenantId: TENANT_ID,
        entityType: "AuthorizationCase",
        action:   "voice.event.applied_to_case",
      },
      orderBy: { occurredAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect((audit!.after as Record<string, unknown>)["approvalNumber"]).toBe("AUTH-67890");
  });

  it("approved callback_deadline creates a Task on the case", async () => {
    const event = await seedEvent("callback_deadline", "Friday before 5pm");

    await voiceService.processReview(TENANT_ID, event.id, "approved", "reviewer-2");

    const task = await prisma.task.findFirst({
      where: { caseId: testCaseId, type: "callback_deadline" },
    });
    expect(task).not.toBeNull();
    expect(task!.description).toContain("Friday before 5pm");
    expect(task!.status).toBe("open");

    const audit = await prisma.auditEvent.findFirst({
      where: { entityId: task!.id, action: "voice.event.applied_to_case" },
    });
    expect(audit).not.toBeNull();
  });

  it("rejected event does not mutate case fields or create tasks", async () => {
    const caseBefore = await prisma.authorizationCase.findUniqueOrThrow({
      where: { id: testCaseId },
    });
    const taskCountBefore = await prisma.task.count({ where: { tenantId: TENANT_ID } });

    const event = await seedEvent("reference_number", "SHOULD-NOT-APPLY");
    await voiceService.processReview(TENANT_ID, event.id, "rejected", "reviewer-1");

    const caseAfter = await prisma.authorizationCase.findUniqueOrThrow({
      where: { id: testCaseId },
    });
    expect(caseAfter.payerCaseRef).toBe(caseBefore.payerCaseRef);
    expect(caseAfter.status).toBe(caseBefore.status);

    const taskCountAfter = await prisma.task.count({ where: { tenantId: TENANT_ID } });
    expect(taskCountAfter).toBe(taskCountBefore);

    const applyAudit = await prisma.auditEvent.findFirst({
      where: {
        tenantId: TENANT_ID,
        entityId: event.id,
        action:   "voice.event.applied_to_case",
      },
    });
    expect(applyAudit).toBeNull();
  });

  it("approved auth_status (non-auto-apply type) does not mutate case status", async () => {
    const event = await seedEvent("auth_status", "Pending peer review", 0.95);
    const caseBefore = await prisma.authorizationCase.findUniqueOrThrow({
      where: { id: testCaseId },
    });

    await voiceService.processReview(TENANT_ID, event.id, "approved", "reviewer-1");

    const caseAfter = await prisma.authorizationCase.findUniqueOrThrow({
      where: { id: testCaseId },
    });
    expect(caseAfter.status).toBe(caseBefore.status);

    const applyAudit = await prisma.auditEvent.findFirst({
      where: {
        tenantId: TENANT_ID,
        entityId: event.id,
        action:   "voice.event.applied_to_case",
      },
    });
    expect(applyAudit).toBeNull();
  });
});
