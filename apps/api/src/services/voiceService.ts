import type { PrismaClient } from "@prisma/client";
import type { TranscriptWebhookPayload, RawExtractedEvent } from "@authos/voice-adapters";
import { requiresHumanReview, AUTO_APPLY_EVENT_TYPES, DomainEvents } from "@authos/domain";
import type { AuditService } from "./auditService.js";

export class VoiceService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async persistTranscript(tenantId: string, payload: TranscriptWebhookPayload) {
    const transcript = await this.db.callTranscript.create({
      data: {
        tenantId,
        caseId:          payload.caseId,
        callSid:         payload.callSid,
        direction:       "inbound",
        transcriptText:  payload.transcriptText,
        durationSeconds: payload.durationSeconds ?? null,
        startedAt:       new Date(payload.completedAt),
        endedAt:         new Date(payload.completedAt),
      },
    });

    await this.audit.emit({
      tenantId,
      entityType: "CallTranscript",
      entityId:   transcript.id,
      action:     DomainEvents.TRANSCRIPT_RECEIVED,
      after:      { callSid: payload.callSid, caseId: payload.caseId },
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
  }
}
