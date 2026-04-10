import type { AuthorizationCaseStatus } from "@authos/shared-types";

// Valid transitions for the AuthorizationCase state machine.
// Key = current status, value = allowed next statuses.
const TRANSITIONS: Record<AuthorizationCaseStatus, AuthorizationCaseStatus[]> = {
  new: ["requirements_found", "closed"],
  requirements_found: ["docs_missing", "ready_to_submit", "closed"],
  docs_missing: ["ready_to_submit", "closed"],
  ready_to_submit: ["submitted", "closed"],
  submitted: ["pending_payer", "more_info_requested", "approved", "denied", "closed"],
  pending_payer: ["more_info_requested", "peer_review_needed", "approved", "denied", "closed"],
  more_info_requested: ["ready_to_submit", "closed"],
  peer_review_needed: ["approved", "denied", "closed"],
  approved: ["closed"],
  denied: ["appealed", "closed"],
  appealed: ["submitted", "approved", "denied", "closed"],
  closed: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: AuthorizationCaseStatus, to: AuthorizationCaseStatus) {
    super(`Invalid case transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertValidTransition(
  from: AuthorizationCaseStatus,
  to: AuthorizationCaseStatus
): void {
  const allowed = TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export function isValidTransition(
  from: AuthorizationCaseStatus,
  to: AuthorizationCaseStatus
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: AuthorizationCaseStatus): AuthorizationCaseStatus[] {
  return TRANSITIONS[from];
}
