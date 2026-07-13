import { isBreached, isNearingBreach, DomainEvents } from "@authos/domain";
import { withTenant } from "../lib/prisma.js";

const TERMINAL_STATUSES = ["approved", "denied", "closed"];

export const slaProcessor = {
  async run(tenantId: string): Promise<{ breached: number; warning: number }> {
    let breachedCount = 0;
    let warningCount = 0;

    const activeCases = await withTenant(tenantId, (tx) => tx.authorizationCase.findMany({
      where: {
        tenantId,
        status: { notIn: TERMINAL_STATUSES as never },
        dueAt: { not: null },
        OR: [{ escalatedAt: null }, { slaWarningAt: null }],
      },
      select: { id: true, tenantId: true, dueAt: true, status: true, version: true, escalatedAt: true, slaWarningAt: true },
    }));

    for (const current of activeCases) {
      if (!current.dueAt) continue;
      const dueAt = current.dueAt;
      const breached = isBreached(dueAt);
      const warning = !breached && isNearingBreach(dueAt);
      if (!breached && !warning) continue;

      const updated = await withTenant(tenantId, async (tx) => {
        const result = await tx.authorizationCase.updateMany({
          where: {
            id: current.id,
            tenantId,
            version: current.version,
            ...(breached ? { escalatedAt: null } : { slaWarningAt: null }),
          },
          data: {
            version: { increment: 1 },
            ...(breached ? { escalatedAt: new Date() } : { slaWarningAt: new Date() }),
          },
        });
        if (result.count !== 1) return false;

        await tx.auditEvent.create({
          data: {
            tenantId,
            entityType: "AuthorizationCase",
            entityId: current.id,
            action: breached ? DomainEvents.SLA_BREACHED : DomainEvents.SLA_BREACH_WARNING,
            after: { dueAt: dueAt.toISOString(), status: current.status },
          },
        });

        if (breached) {
          await tx.task.create({
            data: {
              tenantId,
              caseId: current.id,
              type: "sla_breach",
              description: `SLA breached; case was due ${dueAt.toISOString()}`,
            },
          });
        }
        return true;
      });

      if (!updated) continue;
      if (breached) breachedCount++;
      else warningCount++;
    }

    return { breached: breachedCount, warning: warningCount };
  },
};
