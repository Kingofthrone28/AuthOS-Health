import type { PrismaClient } from "@prisma/client";
import type { TranscriptWebhookPayload, RawExtractedEvent } from "@authos/voice-adapters";
import { requiresHumanReview, AUTO_APPLY_EVENT_TYPES, DomainEvents } from "@authos/domain";
import { AuditService } from "./auditService.js";
import { publishVoiceEvent } from "../lib/voiceEventBus.js";
import { withTenant } from "../lib/prisma.js";

export interface StartCallTranscriptInput {
  caseId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  startedAt?: Date | undefined;
  actorId?: string | undefined;
}

export interface LiveTranscriptUpdateInput {
  callSid: string;
  caseId?: string | null | undefined;
  direction?: "inbound" | "outbound" | undefined;
  transcriptText: string;
  startedAt?: Date | undefined;
}

export class VoiceService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async startCallTranscript(tenantId: string, input: StartCallTranscriptInput) {
    const startedAt = input.startedAt ?? new Date();

    const transcript = await withTenant(this.db, tenantId, async (tx) => {
      const transcript = await tx.callTranscript.upsert({
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
      await new AuditService(tx).emit({
      tenantId,
      entityType: "CallTranscript",
      entityId:   transcript.id,
      action:     DomainEvents.CALL_STARTED,
      ...(input.actorId ? { actorId: input.actorId } : {}),
      after:      { callSid: input.callSid, caseId: input.caseId, direction: input.direction },
      });
      return transcript;
    });

    publishVoiceEvent({
      tenantId,
      type: "call_started",
      callSid: transcript.callSid,
      transcriptId: transcript.id,
      caseId: transcript.caseId,
    });

    return transcript;
  }

  async updateLiveTranscript(tenantId: string, input: LiveTranscriptUpdateInput) {
    const startedAt = input.startedAt ?? new Date();
    const transcript = await withTenant(this.db, tenantId, (tx) => tx.callTranscript.upsert({
      where: { callSid: input.callSid },
      create: {
        tenantId,
        caseId:         input.caseId ?? null,
        callSid:        input.callSid,
        direction:      input.direction ?? "inbound",
        status:         "IN_PROGRESS",
        startedAt,
        transcriptText: input.transcriptText,
      },
      update: {
        ...(input.caseId !== undefined ? { caseId: input.caseId } : {}),
        ...(input.direction ? { direction: input.direction } : {}),
        status:         "IN_PROGRESS",
        transcriptText: input.transcriptText,
      },
    }));

    publishVoiceEvent({
      tenantId,
      type: "transcript_live",
      callSid: transcript.callSid,
      transcriptId: transcript.id,
      caseId: transcript.caseId,
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

    const transcript = await withTenant(this.db, tenantId, async (tx) => {
      const transcript = await tx.callTranscript.upsert({
      where:  { callSid: payload.callSid },
      create: createData,
      update: updateData,
      });
      await new AuditService(tx).emit({
      tenantId,
      entityType: "CallTranscript",
      entityId:   transcript.id,
      action:     DomainEvents.TRANSCRIPT_RECEIVED,
      after:      { callSid: payload.callSid, caseId: transcript.caseId, status: transcript.status },
      });
      return transcript;
    });

    publishVoiceEvent({
      tenantId,
      type: "transcript_completed",
      callSid: transcript.callSid,
      transcriptId: transcript.id,
      caseId: transcript.caseId,
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

    await withTenant(this.db, tenantId, async (tx) => {
    for (const event of events) {
      const isAutoApplyType = AUTO_APPLY_EVENT_TYPES.has(event.eventType as never);
      const needsReview = requiresHumanReview(event) || !isAutoApplyType;

      await tx.extractedEvent.create({
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
        await tx.task.create({
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

    await new AuditService(tx).emit({
      tenantId,
      entityType: "CallTranscript",
      entityId:   transcriptId,
      action:     DomainEvents.EVENT_EXTRACTED,
      after:      { extracted: events.length, routedToReview },
    });
    });

    publishVoiceEvent({
      tenantId,
      type: "events_extracted",
      transcriptId,
      caseId,
    });

    return { persisted: events.length, routedToReview };
  }

  async getVoiceStats(tenantId: string) {
    const { transcriptCount, eventCount, pendingCount } = await withTenant(this.db, tenantId, async (tx) => {
      const [transcriptCount, eventCount, pendingCount] = await Promise.all([
        tx.callTranscript.count({ where: { tenantId } }),
        tx.extractedEvent.count({ where: { tenantId } }),
        tx.extractedEvent.count({ where: { tenantId, reviewStatus: "pending" } }),
      ]);
      return { transcriptCount, eventCount, pendingCount };
    });
    return { transcriptCount, eventCount, pendingCount };
  }

  async listTranscripts(tenantId: string, limit = 20) {
    return withTenant(this.db, tenantId, (tx) => tx.callTranscript.findMany({
      where:   { tenantId },
      include: { extractedEvents: { select: { id: true, reviewStatus: true } } },
      orderBy: { startedAt: "desc" },
      take:    limit,
    }));
  }

  async getActiveTranscriptForCase(tenantId: string, caseId: string) {
    return withTenant(this.db, tenantId, (tx) => tx.callTranscript.findFirst({
      where: {
        tenantId,
        caseId,
        status: "IN_PROGRESS",
      },
      orderBy: { startedAt: "desc" },
    }));
  }

  async listPendingEvents(tenantId: string, limit = 50) {
    return withTenant(this.db, tenantId, (tx) => tx.extractedEvent.findMany({
      where:   { tenantId, reviewStatus: "pending" },
      orderBy: { extractedAt: "desc" },
      take:    limit,
    }));
  }

  async processReview(
    tenantId: string,
    eventId: string,
    decision: "approved" | "rejected",
    reviewedBy: string
  ): Promise<void> {
    const event = await withTenant(this.db, tenantId, async (tx) => {
      const event = await tx.extractedEvent.findFirstOrThrow({ where: { id: eventId, tenantId } });
      await tx.extractedEvent.update({
        where: { id: eventId },
        data: { reviewStatus: decision, reviewedBy, reviewedAt: new Date() },
      });

      const audit = new AuditService(tx);
      await audit.emit({
        tenantId,
        entityType: "ExtractedEvent",
        entityId: eventId,
        action: decision === "approved" ? DomainEvents.EVENT_APPROVED : DomainEvents.EVENT_REJECTED,
        actorId: reviewedBy,
        after: { decision },
      });

      if (decision !== "approved" || !AUTO_APPLY_EVENT_TYPES.has(event.eventType as never)) {
        return event;
      }

      if (event.eventType === "reference_number" || event.eventType === "approval_number") {
        const authCase = await tx.authorizationCase.findFirstOrThrow({ where: { id: event.caseId, tenantId } });
        const result = await tx.authorizationCase.updateMany({
          where: { id: event.caseId, tenantId, version: authCase.version },
          data: {
            ...(event.eventType === "reference_number"
              ? { payerCaseRef: event.value }
              : { approvalNumber: event.value }),
            version: { increment: 1 },
          },
        });
        if (result.count !== 1) throw new Error("Case changed while applying voice review");
        await audit.emit({
          tenantId,
          entityType: "AuthorizationCase",
          entityId: event.caseId,
          action: DomainEvents.EVENT_APPLIED_TO_CASE,
          actorId: reviewedBy,
          after: {
            eventType: event.eventType,
            sourceEventId: eventId,
            ...(event.eventType === "reference_number"
              ? { payerCaseRef: event.value }
              : { approvalNumber: event.value }),
          },
        });
      } else if (event.eventType === "callback_deadline") {
        const task = await tx.task.create({
          data: {
            tenantId,
            caseId: event.caseId,
            type: "callback_deadline",
            description: `Callback deadline from voice extraction: "${event.value}"`,
            status: "open",
          },
        });
        await audit.emit({
          tenantId,
          entityType: "Task",
          entityId: task.id,
          action: DomainEvents.EVENT_APPLIED_TO_CASE,
          actorId: reviewedBy,
          after: { taskType: "callback_deadline", sourceEventId: eventId },
        });
      }

      return event;
    });

    publishVoiceEvent({
      tenantId,
      type: "review_processed",
      transcriptId: event.transcriptId,
      caseId: event.caseId,
    });

  }
}
