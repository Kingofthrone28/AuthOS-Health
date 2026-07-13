import { DomainEvents } from "@authos/domain";
import { withTenant } from "../lib/prisma.js";

const ESCALATION_THRESHOLD_MS = Number(
  process.env["ESCALATION_THRESHOLD_HOURS"] ?? 48
) * 60 * 60 * 1000;

export const escalationProcessor = {
  async run(tenantId: string): Promise<{ escalated: number }> {
    const threshold = new Date(Date.now() - ESCALATION_THRESHOLD_MS);
    let escalatedCount = 0;

    const staleCases = await withTenant(tenantId, (tx) => tx.authorizationCase.findMany({
      where: {
        tenantId,
        status: "pending_payer",
        OR: [{ lastFollowUpAt: null }, { lastFollowUpAt: { lt: threshold } }],
      },
      select: { id: true, tenantId: true, payerName: true, version: true },
    }));

    for (const current of staleCases) {
      const updated = await withTenant(tenantId, async (tx) => {
        const now = new Date();
        const result = await tx.authorizationCase.updateMany({
          where: {
            id: current.id,
            tenantId,
            version: current.version,
            status: "pending_payer",
          },
          data: { lastFollowUpAt: now, escalatedAt: now, version: { increment: 1 } },
        });
        if (result.count !== 1) return false;

        await tx.task.create({
          data: {
            tenantId,
            caseId: current.id,
            type: "payer_follow_up",
            description: `Payer follow-up needed; no response from ${current.payerName}`,
          },
        });
        await tx.auditEvent.create({
          data: {
            tenantId,
            entityType: "AuthorizationCase",
            entityId: current.id,
            action: DomainEvents.CASE_ESCALATED,
            after: { reason: "pending_payer_timeout", payerName: current.payerName },
          },
        });
        return true;
      });

      if (updated) escalatedCount++;
    }

    return { escalated: escalatedCount };
  },
};
