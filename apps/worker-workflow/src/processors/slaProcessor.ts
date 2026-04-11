import { isBreached, isNearingBreach, DomainEvents } from "@authos/domain";
import { getPrismaClient } from "../lib/prisma.js";
import { apiPost } from "../lib/apiClient.js";

const TERMINAL_STATUSES = ["approved", "denied", "closed"];

export const slaProcessor = {
  async run(): Promise<{ breached: number; warning: number }> {
    const db = getPrismaClient();
    let breachedCount = 0;
    let warningCount = 0;

    const activeCases = await db.authorizationCase.findMany({
      where: {
        status: { notIn: TERMINAL_STATUSES as never },
        dueAt: { not: null },
      },
      select: { id: true, tenantId: true, dueAt: true, status: true },
    });

    for (const c of activeCases) {
      if (!c.dueAt) continue;

      if (isBreached(c.dueAt)) {
        breachedCount++;

        await db.auditEvent.create({
          data: {
            tenantId: c.tenantId,
            entityType: "AuthorizationCase",
            entityId: c.id,
            action: DomainEvents.SLA_BREACHED,
            after: { dueAt: c.dueAt.toISOString(), status: c.status },
          },
        });

        await db.authorizationCase.update({
          where: { id: c.id },
          data: { escalatedAt: new Date() },
        });

        try {
          await apiPost("/api/tasks", c.tenantId, {
            caseId: c.id,
            type: "sla_breach",
            description: `SLA breached — case was due ${c.dueAt.toISOString()}`,
          });
        } catch (err) {
          console.error(`Failed to create SLA breach task for case ${c.id}:`, err);
        }
      } else if (isNearingBreach(c.dueAt)) {
        warningCount++;

        await db.auditEvent.create({
          data: {
            tenantId: c.tenantId,
            entityType: "AuthorizationCase",
            entityId: c.id,
            action: DomainEvents.SLA_BREACH_WARNING,
            after: { dueAt: c.dueAt.toISOString(), status: c.status },
          },
        });
      }
    }

    console.log(`SLA check: ${breachedCount} breached, ${warningCount} nearing breach`);
    return { breached: breachedCount, warning: warningCount };
  },
};
