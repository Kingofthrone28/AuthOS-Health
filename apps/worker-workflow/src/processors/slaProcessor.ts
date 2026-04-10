import { isBreached, isNearingBreach, DomainEvents } from "@authos/domain";

// SLA processor — runs on a schedule to detect breached and near-breach cases.
// Emits SLA_BREACH_WARNING and SLA_BREACHED domain events.
export const slaProcessor = {
  async run(): Promise<void> {
    // TODO: query cases where status not in terminal states and dueAt is set
    // TODO: for each case, check isBreached / isNearingBreach
    // TODO: emit DomainEvents.SLA_BREACH_WARNING or SLA_BREACHED via audit emitter
    // TODO: create escalation tasks for breached cases
    console.log("SLA check processor ran", {
      breachEvent: DomainEvents.SLA_BREACHED,
      warningEvent: DomainEvents.SLA_BREACH_WARNING,
    });
  },
};
