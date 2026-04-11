import { getPrismaClient } from "../lib/prisma.js";
import { getPayerAdapter } from "@authos/payer-adapters";
import type { SubmissionPacket } from "@authos/payer-adapters";

const BASE_RETRY_DELAY_MS = Number(process.env["RETRY_BASE_DELAY_MS"] ?? 60_000);

function nextRetryDelay(retryCount: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
}

export const retryProcessor = {
  async run(): Promise<{ retried: number; exhausted: number }> {
    const db = getPrismaClient();
    const now = new Date();
    let retriedCount = 0;
    let exhaustedCount = 0;

    // Prisma can't compare two columns directly, so we fetch all failed
    // submissions with a due retry time and filter retryCount < maxRetries
    // in the application layer.
    const failedSubmissions = await db.submission.findMany({
      where: {
        status: "failed",
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
    });

    const eligible = failedSubmissions.filter(
      (s) => s.retryCount < s.maxRetries
    );

    for (const sub of eligible) {
      let packet: SubmissionPacket;
      try {
        packet = JSON.parse(sub.payloadRef ?? "{}") as SubmissionPacket;
      } catch {
        console.error(`Invalid payload for submission ${sub.id}, skipping`);
        continue;
      }

      try {
        const adapter = getPayerAdapter("portal", {
          payerUrl: process.env["PAYER_URL"],
        });
        const response = await adapter.submit(packet);

        await db.submission.update({
          where: { id: sub.id },
          data: {
            status: "sent",
            retryCount: sub.retryCount + 1,
            nextRetryAt: null,
          },
        });

        await db.payerResponse.create({
          data: {
            submissionId: sub.id,
            caseId: sub.caseId,
            tenantId: sub.tenantId,
            decision: response.decision as "approved" | "denied" | "more_info" | "peer_review" | "pending",
            denialReason: response.denialReason ?? null,
            denialCode: response.denialCode ?? null,
            authNumber: response.authNumber ?? null,
            rawResponseRef: JSON.stringify(response.rawPayload),
          },
        });

        await db.auditEvent.create({
          data: {
            tenantId: sub.tenantId,
            entityType: "Submission",
            entityId: sub.id,
            action: "submission.retried",
            after: { retryCount: sub.retryCount + 1, decision: response.decision },
          },
        });

        retriedCount++;
      } catch (err) {
        const newRetryCount = sub.retryCount + 1;

        if (newRetryCount >= sub.maxRetries) {
          await db.submission.update({
            where: { id: sub.id },
            data: {
              status: "exhausted",
              retryCount: newRetryCount,
            },
          });
          exhaustedCount++;

          await db.auditEvent.create({
            data: {
              tenantId: sub.tenantId,
              entityType: "Submission",
              entityId: sub.id,
              action: "submission.exhausted",
              after: { retryCount: newRetryCount, maxRetries: sub.maxRetries },
            },
          });
        } else {
          await db.submission.update({
            where: { id: sub.id },
            data: {
              retryCount: newRetryCount,
              nextRetryAt: new Date(Date.now() + nextRetryDelay(newRetryCount)),
            },
          });

          await db.auditEvent.create({
            data: {
              tenantId: sub.tenantId,
              entityType: "Submission",
              entityId: sub.id,
              action: "submission.retry_scheduled",
              after: {
                retryCount: newRetryCount,
                nextRetryAt: new Date(Date.now() + nextRetryDelay(newRetryCount)).toISOString(),
              },
            },
          });
        }

        console.error(`Retry failed for submission ${sub.id}:`, err);
      }
    }

    console.log(`Retry: ${retriedCount} retried, ${exhaustedCount} exhausted`);
    return { retried: retriedCount, exhausted: exhaustedCount };
  },
};
