import { type PrismaClient, Prisma } from "@prisma/client";
import type { AuditEmitter } from "@authos/audit";
import { buildAuditEvent } from "@authos/audit";
import type { AuditEvent } from "@authos/shared-types";

export class AuditService implements AuditEmitter {
  constructor(private readonly db: PrismaClient) {}

  async emit(fields: Omit<AuditEvent, "id" | "occurredAt">): Promise<void> {
    const event = buildAuditEvent(fields);
    await this.db.auditEvent.create({
      data: {
        tenantId:   event.tenantId,
        entityType: event.entityType,
        entityId:   event.entityId,
        action:     event.action,
        actorId:    event.actorId ?? null,
        before:     event.before != null ? (event.before as Prisma.InputJsonValue) : Prisma.JsonNull,
        after:      event.after != null  ? (event.after as Prisma.InputJsonValue)  : Prisma.JsonNull,
        metadata:   event.metadata != null ? (event.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        occurredAt: event.occurredAt,
      },
    });
  }
}
