import { DomainEvents } from "@authos/domain";
import { getPrismaClient } from "../lib/prisma.js";
import { apiPost } from "../lib/apiClient.js";

const ESCALATION_THRESHOLD_MS = Number(
  process.env["ESCALATION_THRESHOLD_HOURS"] ?? 48
) * 60 * 60 * 1000;

export const escalationProcessor = {
  async run(): Promise<{ escalated: number }> {
    const db = getPrismaClient();
    const threshold = new Date(Date.now() - ESCALATION_THRESHOLD_MS);
    let escalatedCount = 0;

    const staleCases = await db.authorizationCase.findMany({
      where: {
        status: "pending_payer",
        OR: [
          { lastFollowUpAt: null },
          { lastFollowUpAt: { lt: threshold } },
        ],
      },
      select: { id: true, tenantId: true, payerName: true },
    });

    for (const c of staleCases) {
      escalatedCount++;

      await db.authorizationCase.update({
        where: { id: c.id },
        data: {
          lastFollowUpAt: new Date(),
          escalatedAt: new Date(),
        },
      });

      await db.auditEvent.create({
        data: {
          tenantId: c.tenantId,
          entityType: "AuthorizationCase",
          entityId: c.id,
          action: DomainEvents.CASE_ESCALATED,
          after: { reason: "pending_payer_timeout", payerName: c.payerName },
        },
      });

      try {
        await apiPost("/api/tasks", c.tenantId, {
          caseId: c.id,
          type: "payer_follow_up",
          description: `Payer follow-up needed — no response from ${c.payerName}`,
        });
      } catch (err) {
        console.error(`Failed to create follow-up task for case ${c.id}:`, err);
      }
    }

    console.log(`Escalation: ${escalatedCount} cases escalated`);
    return { escalated: escalatedCount };
  },
};
