// Canonical domain event names.
// Use these constants everywhere — never raw strings.

export const DomainEvents = {
  // Case lifecycle
  CASE_CREATED: "case.created",
  CASE_ASSIGNED: "case.assigned",
  CASE_STATUS_CHANGED: "case.status_changed",
  CASE_CLOSED: "case.closed",

  // Requirements
  REQUIREMENTS_DISCOVERED: "requirements.discovered",
  REQUIREMENT_COMPLETED: "requirement.completed",

  // Submission
  SUBMISSION_BUILT: "submission.built",
  SUBMISSION_SENT: "submission.sent",
  PAYER_RESPONSE_RECEIVED: "payer.response.received",

  // Voice AI
  CALL_STARTED: "voice.call.started",
  CALL_ENDED: "voice.call.ended",
  TRANSCRIPT_RECEIVED: "voice.transcript.received",
  EVENT_EXTRACTED: "voice.event.extracted",
  EVENT_APPROVED: "voice.event.approved",
  EVENT_REJECTED: "voice.event.rejected",
  EVENT_APPLIED_TO_CASE: "voice.event.applied_to_case",

  // Documents
  ATTACHMENT_UPLOADED: "attachment.uploaded",
  ATTACHMENT_CLASSIFIED: "attachment.classified",

  // Workflow
  SLA_BREACH_WARNING: "sla.breach.warning",
  SLA_BREACHED: "sla.breached",
  CASE_ESCALATED: "case.escalated",
  TASK_CREATED: "task.created",
  TASK_COMPLETED: "task.completed",
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];
