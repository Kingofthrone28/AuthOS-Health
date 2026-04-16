import type { PrismaClient } from "@prisma/client";
import { DomainEvents } from "@authos/domain";
import type { AuditService } from "./auditService.js";

const CRD_URL = process.env["CRD_URL"] ?? "http://localhost:3004";

interface CrdRequirement {
  code: string;
  description: string;
  required: boolean;
}

interface CrdResponse {
  authRequired: boolean;
  requirements: CrdRequirement[];
}

export class RequirementsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async discoverRequirements(tenantId: string, caseId: string, actorId: string) {
    const authCase = await this.db.authorizationCase.findFirstOrThrow({
      where: { id: caseId, tenantId },
    });

    // Call mock CRD server
    const res = await fetch(`${CRD_URL}/crd/check`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        serviceCode: authCase.serviceCode ?? "",
        payerId:     authCase.payerName,
      }),
    });

    if (!res.ok) throw new Error(`CRD check failed: ${res.status}`);
    const crd = (await res.json()) as CrdResponse;

    if (!crd.authRequired) {
      // No auth needed — close case
      await this.db.authorizationCase.update({
        where: { id: caseId },
        data:  { status: "closed" },
      });
      return { authRequired: false, requirements: [] };
    }

    // Persist requirements
    const created = await this.db.authorizationRequirement.createMany({
      data: crd.requirements.map((r) => ({
        caseId,
        tenantId,
        description: r.description,
        required:    r.required,
        source:      "crd" as const,
      })),
      skipDuplicates: true,
    });

    // Determine next status
    const hasIncomplete = crd.requirements.some((r) => r.required);
    const nextStatus = hasIncomplete ? "docs_missing" : "requirements_found";

    await this.db.authorizationCase.update({
      where: { id: caseId },
      data:  { status: nextStatus },
    });

    // Close the open "review" task that prompted this check
    await this.db.task.updateMany({
      where: { caseId, tenantId, type: "review", completedAt: null },
      data:  { completedAt: new Date() },
    });

    await this.audit.emit({
      tenantId,
      entityType: "AuthorizationCase",
      entityId:   caseId,
      action:     DomainEvents.REQUIREMENTS_DISCOVERED,
      actorId,
      after:      { requirementsCount: created.count, status: nextStatus },
    });

    return { authRequired: true, requirements: crd.requirements };
  }

  async getRequirements(tenantId: string, caseId: string) {
    return this.db.authorizationRequirement.findMany({
      where: { caseId, tenantId },
      orderBy: { required: "desc" },
    });
  }

  async completeRequirement(tenantId: string, caseId: string, reqId: string, actorId: string) {
    const req = await this.db.authorizationRequirement.update({
      where: { id: reqId },
      data:  { completed: true, completedAt: new Date(), completedBy: actorId },
    });

    await this.audit.emit({
      tenantId,
      entityType: "AuthorizationRequirement",
      entityId:   reqId,
      action:     DomainEvents.REQUIREMENT_COMPLETED,
      actorId,
    });

    // Check if all required items are done → transition to ready_to_submit,
    // but only when the case is in a state where completing docs unblocks submission.
    // Guards against mutating status on already-submitted/approved/denied cases.
    const [remaining, total, theCase] = await Promise.all([
      this.db.authorizationRequirement.count({
        where: { caseId, tenantId, required: true, completed: false },
      }),
      this.db.authorizationRequirement.count({
        where: { caseId, tenantId, required: true },
      }),
      this.db.authorizationCase.findFirst({
        where: { id: caseId, tenantId },
        select: { status: true },
      }),
    ]);

    const autoTransitionFrom = ["docs_missing", "more_info_requested", "requirements_found"];
    if (remaining === 0 && total > 0 && theCase && autoTransitionFrom.includes(theCase.status)) {
      await this.db.authorizationCase.update({
        where: { id: caseId },
        data:  { status: "ready_to_submit" },
      });
    }

    return req;
  }
}
