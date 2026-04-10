import type { CasePriority } from "@authos/shared-types";

// SLA durations in calendar hours per CMS / payer norms.
// Expedited: 72h, Standard: 7 business days (~168h as a conservative calendar estimate).
const SLA_HOURS: Record<CasePriority, number> = {
  urgent: 24,
  expedited: 72,
  standard: 168,
};

export function calculateDueAt(priority: CasePriority, from: Date = new Date()): Date {
  const hours = SLA_HOURS[priority];
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function isBreached(dueAt: Date, now: Date = new Date()): boolean {
  return now > dueAt;
}

export function hoursRemaining(dueAt: Date, now: Date = new Date()): number {
  return (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function isNearingBreach(dueAt: Date, thresholdHours = 4, now: Date = new Date()): boolean {
  const remaining = hoursRemaining(dueAt, now);
  return remaining > 0 && remaining <= thresholdHours;
}
