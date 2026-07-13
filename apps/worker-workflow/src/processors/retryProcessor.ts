import { getPayerAdapter } from "@authos/payer-adapters";
import type { SubmissionPacket } from "@authos/payer-adapters";
import { withTenant } from "../lib/prisma.js";

const BASE_RETRY_DELAY_MS = Number(process.env["RETRY_BASE_DELAY_MS"] ?? 60_000);

function nextRetryDelay(retryCount: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
}

export const retryProcessor = {
  async run(tenantId: string): Promise<{ retried: number; exhausted: number }> {
    const now = new Date();
    let retriedCount = 0;
    let exhaustedCount = 0;

    const failedSubmissions = await withTenant(tenantId, (tx) => tx.submission.findMany({
      where: {
        tenantId,
        status: "failed",
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
    }));

    for (const submission of failedSubmissions.filter((s) => s.retryCount < s.maxRetries)) {
      let packet: SubmissionPacket;
      try {
        packet = JSON.parse(submission.payloadRef ?? "{}") as SubmissionPacket;
      } catch {
        continue;
      }

      try {
        const adapter = getPayerAdapter("portal", { payerUrl: process.env["PAYER_URL"] });
        const response = await adapter.submit(packet);
        await withTenant(tenantId, async (tx) => {
          const result = await tx.submission.updateMany({
            where: { id: submission.id, tenantId, version: submission.version, status: "failed" },
            data: { status: "sent", retryCount: { increment: 1 }, nextRetryAt: null, version: { increment: 1 } },
          });
          if (result.count !== 1) return;

          await tx.payerResponse.create({
            data: {
              submissionId: submission.id,
              caseId: submission.caseId,
              tenantId,
              decision: response.decision as "approved" | "denied" | "more_info" | "peer_review" | "pending",
              denialReason: response.denialReason ?? null,
              denialCode: response.denialCode ?? null,
              authNumber: response.authNumber ?? null,
              rawResponseRef: JSON.stringify(response.rawPayload),
            },
          });
          await tx.auditEvent.create({
            data: {
              tenantId,
              entityType: "Submission",
              entityId: submission.id,
              action: "submission.retried",
              after: { retryCount: submission.retryCount + 1, decision: response.decision },
            },
          });
        });
        retriedCount++;
      } catch {
        const newRetryCount = submission.retryCount + 1;
        const exhausted = newRetryCount >= submission.maxRetries;
        const retryAt = new Date(Date.now() + nextRetryDelay(newRetryCount));

        await withTenant(tenantId, async (tx) => {
          const result = await tx.submission.updateMany({
            where: { id: submission.id, tenantId, version: submission.version, status: "failed" },
            data: {
              status: exhausted ? "exhausted" : "failed",
              retryCount: newRetryCount,
              ...(exhausted ? { nextRetryAt: null } : { nextRetryAt: retryAt }),
              version: { increment: 1 },
            },
          });
          if (result.count !== 1) return;
          await tx.auditEvent.create({
            data: {
              tenantId,
              entityType: "Submission",
              entityId: submission.id,
              action: exhausted ? "submission.exhausted" : "submission.retry_scheduled",
              after: exhausted
                ? { retryCount: newRetryCount, maxRetries: submission.maxRetries }
                : { retryCount: newRetryCount, nextRetryAt: retryAt.toISOString() },
            },
          });
        });

        if (exhausted) exhaustedCount++;
      }
    }

    return { retried: retriedCount, exhausted: exhaustedCount };
  },
};
