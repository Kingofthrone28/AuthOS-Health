import type { PrismaClient, CaseStatus, SubmissionProtocol } from "@prisma/client";
import { assertValidTransition, DomainEvents } from "@authos/domain";
import type { AuthorizationCaseStatus } from "@authos/shared-types";
import { getPayerAdapter } from "@authos/payer-adapters";
import type { SubmissionPacket, PayerDecisionResponse } from "@authos/payer-adapters";
import { AuditService } from "./auditService.js";
import { withTenant } from "../lib/prisma.js";
import { OptimisticLockError } from "./errors.js";

const DECISION_TO_STATUS: Record<string, AuthorizationCaseStatus> = {
  approved: "approved",
  denied: "denied",
  pending: "pending_payer",
  more_info: "more_info_requested",
  peer_review: "peer_review_needed",
};

export class SubmissionService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async buildPacket(tenantId: string, caseId: string): Promise<SubmissionPacket> {
    const authCase = await withTenant(this.db, tenantId, (tx) => tx.authorizationCase.findFirstOrThrow({
      where: { id: caseId, tenantId },
      include: {
        patient: true,
        coverage: true,
        order: true,
        attachments: true,
      },
    }));

    if (authCase.status !== "ready_to_submit" && authCase.status !== "appealed") {
      throw new Error(
        `Case ${caseId} is in status '${authCase.status}' — must be 'ready_to_submit' or 'appealed'`
      );
    }

    const packet: SubmissionPacket = {
      protocol: "portal",
      tenantId,
      caseId,
      patientMemberId: authCase.coverage.memberId,
      payerId: authCase.coverage.payerId ?? authCase.payerName,
      serviceCode: authCase.serviceCode ?? authCase.order?.serviceCode ?? "",
      serviceType: authCase.serviceType,
      priority: authCase.priority as "standard" | "expedited" | "urgent",
      diagnosisCodes: [],
      attachmentRefs: authCase.attachments.map((a) => a.id),
    };

    await withTenant(this.db, tenantId, (tx) => new AuditService(tx).emit({
      tenantId,
      entityType: "AuthorizationCase",
      entityId: caseId,
      action: DomainEvents.SUBMISSION_BUILT,
      after: { protocol: packet.protocol, serviceCode: packet.serviceCode },
    }));

    return packet;
  }

  async submit(tenantId: string, caseId: string, submittedBy: string) {
    const packet = await this.buildPacket(tenantId, caseId);

    const adapter = getPayerAdapter(packet.protocol as "portal", {
      payerUrl: process.env["PAYER_URL"],
    });

    let response: PayerDecisionResponse;
    try {
      response = await adapter.submit(packet);
    } catch (err) {
      await withTenant(this.db, tenantId, async (tx) => {
        const failed = await tx.submission.create({
          data: {
            caseId,
            tenantId,
            protocol: packet.protocol as SubmissionProtocol,
            submittedBy,
            status: "failed",
            payloadRef: JSON.stringify(packet),
          },
        });
        await new AuditService(tx).emit({
          tenantId,
          entityType: "Submission",
          entityId: failed.id,
          action: "submission.failed",
          actorId: submittedBy,
          after: { status: "failed" },
        });
      });
      throw err;
    }

    return this.persistResponse(tenantId, caseId, submittedBy, packet, response);
  }

  async listSubmissions(tenantId: string, caseId: string) {
    return withTenant(this.db, tenantId, (tx) => tx.submission.findMany({
      where: { caseId, tenantId },
      include: { responses: true },
      orderBy: { submittedAt: "desc" },
    }));
  }

  async resubmit(tenantId: string, caseId: string, submittedBy: string) {
    const authCase = await withTenant(this.db, tenantId, (tx) => tx.authorizationCase.findFirstOrThrow({
      where: { id: caseId, tenantId },
    }));

    if (authCase.status !== "appealed") {
      throw new Error(
        `Case ${caseId} must be in 'appealed' status to resubmit (current: ${authCase.status})`
      );
    }

    // Build packet while still in 'appealed' (buildPacket allows appealed)
    const packet = await this.buildPacket(tenantId, caseId);

    // Now submit using the pre-built packet
    const adapter = getPayerAdapter(packet.protocol as "portal", {
      payerUrl: process.env["PAYER_URL"],
    });

    const response = await adapter.submit(packet);

    return this.persistResponse(tenantId, caseId, submittedBy, packet, response);
  }

  private async persistResponse(
    tenantId: string,
    caseId: string,
    submittedBy: string,
    packet: SubmissionPacket,
    response: PayerDecisionResponse,
  ) {
    return withTenant(this.db, tenantId, async (tx) => {
      const current = await tx.authorizationCase.findFirstOrThrow({ where: { id: caseId, tenantId } });
      assertValidTransition(current.status as AuthorizationCaseStatus, "submitted");

      const submittedResult = await tx.authorizationCase.updateMany({
        where: { id: caseId, tenantId, version: current.version },
        data: { status: "submitted" as CaseStatus, version: { increment: 1 } },
      });
      if (submittedResult.count !== 1) throw new OptimisticLockError("AuthorizationCase", caseId);

      const submission = await tx.submission.create({
        data: {
          caseId,
          tenantId,
          protocol: packet.protocol as SubmissionProtocol,
          submittedBy,
          status: "sent",
          payloadRef: JSON.stringify(packet),
        },
      });

      const payerResponse = await tx.payerResponse.create({
        data: {
          submissionId: submission.id,
          caseId,
          tenantId,
          decision: response.decision as "approved" | "denied" | "more_info" | "peer_review" | "pending",
          denialReason: response.denialReason ?? null,
          denialCode: response.denialCode ?? null,
          authNumber: response.authNumber ?? null,
          rawResponseRef: JSON.stringify(response.rawPayload),
        },
      });

      const newStatus = DECISION_TO_STATUS[response.decision];
      const submittedVersion = current.version + 1;
      if (newStatus) {
        assertValidTransition("submitted", newStatus);
        const decisionResult = await tx.authorizationCase.updateMany({
          where: { id: caseId, tenantId, version: submittedVersion },
          data: {
            status: newStatus as CaseStatus,
            version: { increment: 1 },
            ...(response.authNumber ? { payerCaseRef: response.authNumber } : {}),
          },
        });
        if (decisionResult.count !== 1) throw new OptimisticLockError("AuthorizationCase", caseId);
      }

      const audit = new AuditService(tx);
      await audit.emit({
        tenantId,
        entityType: "Submission",
        entityId: submission.id,
        action: DomainEvents.SUBMISSION_SENT,
        actorId: submittedBy,
        after: { protocol: packet.protocol, decision: response.decision },
      });
      await audit.emit({
        tenantId,
        entityType: "PayerResponse",
        entityId: payerResponse.id,
        action: DomainEvents.PAYER_RESPONSE_RECEIVED,
        after: { decision: response.decision, authNumber: response.authNumber },
      });

      return { submission, payerResponse, newStatus };
    });
  }
}
