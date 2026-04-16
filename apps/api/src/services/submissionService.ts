import type { PrismaClient, CaseStatus, SubmissionProtocol } from "@prisma/client";
import { assertValidTransition, DomainEvents } from "@authos/domain";
import type { AuthorizationCaseStatus } from "@authos/shared-types";
import { getPayerAdapter } from "@authos/payer-adapters";
import type { SubmissionPacket, PayerDecisionResponse } from "@authos/payer-adapters";
import type { AuditService } from "./auditService.js";

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
    const authCase = await this.db.authorizationCase.findFirstOrThrow({
      where: { id: caseId, tenantId },
      include: {
        patient: true,
        coverage: true,
        order: true,
        attachments: true,
      },
    });

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

    await this.audit.emit({
      tenantId,
      entityType: "AuthorizationCase",
      entityId: caseId,
      action: DomainEvents.SUBMISSION_BUILT,
      after: { protocol: packet.protocol, serviceCode: packet.serviceCode },
    });

    return packet;
  }

  async submit(tenantId: string, caseId: string, submittedBy: string) {
    const packet = await this.buildPacket(tenantId, caseId);

    // Re-fetch current status — buildPacket already validated it is ready_to_submit or appealed,
    // but we need the actual value to pass into assertValidTransition rather than hard-coding it.
    const current = await this.db.authorizationCase.findFirstOrThrow({
      where: { id: caseId, tenantId },
      select: { status: true },
    });
    assertValidTransition(current.status as AuthorizationCaseStatus, "submitted");
    await this.db.authorizationCase.update({
      where: { id: caseId },
      data: { status: "submitted" as CaseStatus },
    });

    const adapter = getPayerAdapter(packet.protocol as "portal", {
      payerUrl: process.env["PAYER_URL"],
    });

    let response: PayerDecisionResponse;
    try {
      response = await adapter.submit(packet);
    } catch (err) {
      await this.db.submission.create({
        data: {
          caseId,
          tenantId,
          protocol: packet.protocol as SubmissionProtocol,
          submittedBy,
          status: "failed",
          payloadRef: JSON.stringify(packet),
        },
      });
      throw err;
    }

    const submission = await this.db.submission.create({
      data: {
        caseId,
        tenantId,
        protocol: packet.protocol as SubmissionProtocol,
        submittedBy,
        status: "sent",
        payloadRef: JSON.stringify(packet),
      },
    });

    const payerResponse = await this.db.payerResponse.create({
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

    // Transition submitted -> payer decision status
    const newStatus = DECISION_TO_STATUS[response.decision];
    if (newStatus) {
      assertValidTransition("submitted", newStatus);
      await this.db.authorizationCase.update({
        where: { id: caseId },
        data: {
          status: newStatus as CaseStatus,
          ...(response.authNumber ? { payerCaseRef: response.authNumber } : {}),
        },
      });
    }

    await this.audit.emit({
      tenantId,
      entityType: "Submission",
      entityId: submission.id,
      action: DomainEvents.SUBMISSION_SENT,
      actorId: submittedBy,
      after: { protocol: packet.protocol, decision: response.decision },
    });

    await this.audit.emit({
      tenantId,
      entityType: "PayerResponse",
      entityId: payerResponse.id,
      action: DomainEvents.PAYER_RESPONSE_RECEIVED,
      after: {
        decision: response.decision,
        authNumber: response.authNumber,
        denialReason: response.denialReason,
      },
    });

    return {
      submission,
      payerResponse,
      newStatus,
    };
  }

  async listSubmissions(tenantId: string, caseId: string) {
    return this.db.submission.findMany({
      where: { caseId, tenantId },
      include: { responses: true },
      orderBy: { submittedAt: "desc" },
    });
  }

  async resubmit(tenantId: string, caseId: string, submittedBy: string) {
    const authCase = await this.db.authorizationCase.findFirstOrThrow({
      where: { id: caseId, tenantId },
    });

    if (authCase.status !== "appealed") {
      throw new Error(
        `Case ${caseId} must be in 'appealed' status to resubmit (current: ${authCase.status})`
      );
    }

    // Build packet while still in 'appealed' (buildPacket allows appealed)
    const packet = await this.buildPacket(tenantId, caseId);

    // Transition to submitted
    assertValidTransition(authCase.status as AuthorizationCaseStatus, "submitted");
    await this.db.authorizationCase.update({
      where: { id: caseId },
      data: { status: "submitted" as CaseStatus },
    });

    // Now submit using the pre-built packet
    const adapter = getPayerAdapter(packet.protocol as "portal", {
      payerUrl: process.env["PAYER_URL"],
    });

    const response = await adapter.submit(packet);

    const submission = await this.db.submission.create({
      data: {
        caseId,
        tenantId,
        protocol: packet.protocol as SubmissionProtocol,
        submittedBy,
        status: "sent",
        payloadRef: JSON.stringify(packet),
      },
    });

    const payerResponse = await this.db.payerResponse.create({
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
    if (newStatus) {
      assertValidTransition("submitted", newStatus);
      await this.db.authorizationCase.update({
        where: { id: caseId },
        data: {
          status: newStatus as CaseStatus,
          ...(response.authNumber ? { payerCaseRef: response.authNumber } : {}),
        },
      });
    }

    await this.audit.emit({
      tenantId,
      entityType: "Submission",
      entityId: submission.id,
      action: DomainEvents.SUBMISSION_SENT,
      actorId: submittedBy,
      after: { protocol: packet.protocol, decision: response.decision, resubmit: true },
    });

    return { submission, payerResponse, newStatus };
  }
}
