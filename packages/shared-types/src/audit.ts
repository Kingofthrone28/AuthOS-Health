// Audit and document entities

export interface AuditEvent {
  id: string;
  tenantId: string;
  entityType: string; // e.g. "AuthorizationCase", "ExtractedEvent"
  entityId: string;
  action: string; // e.g. "case.created", "voice.event.approved"
  actorId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

export interface Attachment {
  id: string;
  caseId: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageRef: string; // blob storage reference
  classification?: string;
  uploadedBy: string;
  uploadedAt: Date;
}
