import type { AuditEvent } from "@authos/shared-types";

// AuditEmitter interface — implemented by each app/service using its own persistence layer.
export interface AuditEmitter {
  emit(event: Omit<AuditEvent, "id" | "occurredAt">): Promise<void>;
}

// NoopAuditEmitter for tests and local dev where persistence is not wired.
export class NoopAuditEmitter implements AuditEmitter {
  async emit(_event: Omit<AuditEvent, "id" | "occurredAt">): Promise<void> {
    // intentionally empty
  }
}

// buildAuditEvent helper — fills in occurredAt and enforces immutability shape.
export function buildAuditEvent(
  fields: Omit<AuditEvent, "id" | "occurredAt">
): Omit<AuditEvent, "id"> {
  return {
    ...fields,
    occurredAt: new Date(),
  };
}
