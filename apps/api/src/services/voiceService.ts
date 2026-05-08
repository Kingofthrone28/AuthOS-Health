import type { PrismaClient } from "@prisma/client";
import type { TranscriptWebhookPayload, RawExtractedEvent } from "@authos/voice-adapters";
import { requiresHumanReview, AUTO_APPLY_EVENT_TYPES, DomainEvents } from "@authos/domain";
import type { AuditService } from "./auditService.js";

export interface StartCallTranscriptInput {
  caseId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  startedAt?: Date | undefined;
  actorId?: string | undefined;
}

export class VoiceService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async startCallTranscript(tenantId: string, input: StartCallTranscriptInput) {
    const startedAt = input.startedAt ?? new Date();

    const transcript = await this.db.callTranscript.upsert({
      where: { callSid: input.callSid },
      create: {
        tenantId,
        caseId:    input.caseId,
        callSid:   input.callSid,
        direction: input.direction,
        status:    "IN_PROGRESS",
        startedAt,
      },
      update: {
        tenantId,
        caseId:    input.caseId,
        direction: input.direction,
        status:    "IN_PROGRESS",
        startedAt,
      },
    });

    await this.audit.emit({
      tenantId,
      entityType: "CallTranscript",
      entityId:   transcript.id,
      action:     DomainEvents.CALL_STARTED,
      ...(input.actorId ? { actorId: input.actorId } : {}),
      after:      { callSid: input.callSid, caseId: input.caseId, direction: input.direction },
    });

    return transcript;
  }

  async persistTranscript(tenantId: string, payload: TranscriptWebhookPayload) {
    const completedAt = new Date(payload.completedAt);
    const createData = {
      tenantId,
      caseId:          payload.caseId ?? null,
      callSid:         payload.callSid,
      direction:       payload.direction ?? "inbound",
      status:          "COMPLETED" as const,
      transcriptText:  payload.transcriptText,
      durationSeconds: payload.durationSeconds ?? null,
      startedAt:       completedAt,
      endedAt:         completedAt,
    };
    const updateData = {
      ...(payload.caseId !== undefined ? { caseId: payload.caseId } : {}),
      ...(payload.direction ? { direction: payload.direction } : {}),
      status:          "COMPLETED" as const,
      transcriptText:  payload.transcriptText,
      durationSeconds: payload.durationSeconds ?? null,
      endedAt:         completedAt,
    };

    const transcript = await this.db.callTranscript.upsert({
      where:  { callSid: payload.callSid },
      create: createData,
      update: updateData,
    });

    await this.audit.emit({
      tenantId,
      entityType: "CallTranscript",
      entityId:   transcript.id,
      action:     DomainEvents.TRANSCRIPT_RECEIVED,
      after:      { callSid: payload.callSid, caseId: transcript.caseId, status: transcript.status },
    });

    return transcript;
  }

  async persistExtractedEvents(
    tenantId: string,
    transcriptId: string,
    caseId: string,
    events: RawExtractedEvent[]
  ): Promise<{ persisted: number; routedToReview: number }> {
    let routedToReview = 0;

    for (const event of events) {
      const isAutoApplyType = AUTO_APPLY_EVENT_TYPES.has(event.eventType as never);
      const needsReview = requiresHumanReview(event) || !isAutoApplyType;

      await this.db.extractedEvent.create({
        data: {
          tenantId,
          transcriptId,
          caseId,
          eventType:    event.eventType,
          value:        event.value,
          confidence:   event.confidence,
          reviewStatus: needsReview ? "pending" : "approved",
          extractedAt:  new Date(),
        },
      });

      if (needsReview) {
        routedToReview++;
        await this.db.task.create({
          data: {
            tenantId,
            caseId,
            type: "review_extraction",
            description:
              `Review extracted ${event.eventType}: "${event.value}" ` +
              `(confidence ${(event.confidence * 100).toFixed(0)}%)`,
          },
        });
      }
    }

    await this.audit.emit({
      tenantId,
      entityType: "CallTranscript",
      entityId:   transcriptId,
      action:     DomainEvents.EVENT_EXTRACTED,
      after:      { extracted: events.length, routedToReview },
    });

    return { persisted: events.length, routedToReview };
  }

  async getVoiceStats(tenantId: string) {
    const [transcriptCount, eventCount, pendingCount] = await Promise.all([
      this.db.callTranscript.count({ where: { tenantId } }),
      this.db.extractedEvent.count({ where: { tenantId } }),
      this.db.extractedEvent.count({ where: { tenantId, reviewStatus: "pending" } }),
    ]);
    return { transcriptCount, eventCount, pendingCount };
  }

  async listTranscripts(tenantId: string, limit = 20) {
    return this.db.callTranscript.findMany({
      where:   { tenantId },
      include: { extractedEvents: { select: { id: true, reviewStatus: true } } },
      orderBy: { startedAt: "desc" },
      take:    limit,
    });
  }

  async getActiveTranscriptForCase(tenantId: string, caseId: string) {
    return this.db.callTranscript.findFirst({
      where: {
        tenantId,
        caseId,
        status: "IN_PROGRESS",
      },
      orderBy: { startedAt: "desc" },
    });
  }

  async listPendingEvents(tenantId: string, limit = 50) {
    return this.db.extractedEvent.findMany({
      where:   { tenantId, reviewStatus: "pending" },
      orderBy: { extractedAt: "desc" },
      take:    limit,
    });
  }

  async processReview(
    tenantId: string,
    eventId: string,
    decision: "approved" | "rejected",
    reviewedBy: string
  ): Promise<void> {
    await this.db.extractedEvent.update({
      where: { id: eventId },
      data:  { reviewStatus: decision, reviewedBy, reviewedAt: new Date() },
    });

    await this.audit.emit({
      tenantId,
      entityType: "ExtractedEvent",
      entityId:   eventId,
      action:
        decision === "approved"
          ? DomainEvents.EVENT_APPROVED
          : DomainEvents.EVENT_REJECTED,
      actorId: reviewedBy,
      after:   { decision },
    });

    if (decision !== "approved") return;

    const event = await this.db.extractedEvent.findUniqueOrThrow({
      where: { id: eventId },
    });

    if (!AUTO_APPLY_EVENT_TYPES.has(event.eventType as never)) return;

    if (event.eventType === "reference_number") {
      await this.db.authorizationCase.update({
        where: { id: event.caseId },
        data:  { payerCaseRef: event.value },
      });
      await this.audit.emit({
        tenantId,
        entityType: "AuthorizationCase",
        entityId:   event.caseId,
        action:     DomainEvents.EVENT_APPLIED_TO_CASE,
        actorId:    reviewedBy,
        after:      { payerCaseRef: event.value, sourceEventId: eventId },
      });
    } else if (event.eventType === "approval_number") {
      await this.db.authorizationCase.update({
        where: { id: event.caseId },
        data:  { approvalNumber: event.value },
      });
      await this.audit.emit({
        tenantId,
        entityType: "AuthorizationCase",
        entityId:   event.caseId,
        action:     DomainEvents.EVENT_APPLIED_TO_CASE,
        actorId:    reviewedBy,
        after:      { approvalNumber: event.value, sourceEventId: eventId },
      });
    } else if (event.eventType === "callback_deadline") {
      const task = await this.db.task.create({
        data: {
          tenantId,
          caseId:      event.caseId,
          type:        "callback_deadline",
          description: `Callback deadline from voice extraction: "${event.value}"`,
          status:      "open",
        },
      });
      await this.audit.emit({
        tenantId,
        entityType: "Task",
        entityId:   task.id,
        action:     DomainEvents.EVENT_APPLIED_TO_CASE,
        actorId:    reviewedBy,
        after:      { taskType: "callback_deadline", value: event.value, sourceEventId: eventId },
      });
    }
  }
}
