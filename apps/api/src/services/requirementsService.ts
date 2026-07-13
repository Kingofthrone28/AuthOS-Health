import type { Prisma, PrismaClient } from "@prisma/client";
import { assertValidTransition, DomainEvents } from "@authos/domain";
import { AuditService } from "./auditService.js";
import { withTenant } from "../lib/prisma.js";
import { OptimisticLockError } from "./errors.js";

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

export async function completeRequirementInTransaction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  caseId: string,
  reqId: string,
  actorId: string,
) {
  const existing = await tx.authorizationRequirement.findFirstOrThrow({
    where: { id: reqId, caseId, tenantId },
  });
  const audit = new AuditService(tx);

  const requirement = existing.completed
    ? existing
    : await tx.authorizationRequirement.update({
        where: { id: reqId },
        data: { completed: true, completedAt: new Date(), completedBy: actorId },
      });

  if (!existing.completed) {
    await audit.emit({
      tenantId,
      entityType: "AuthorizationRequirement",
      entityId: reqId,
      action: DomainEvents.REQUIREMENT_COMPLETED,
      actorId,
      before: { completed: false },
      after: { completed: true },
    });
  }

  const linkedTasks = await tx.task.findMany({
    where: {
      tenantId,
      caseId,
      requirementId: reqId,
      status: "open",
      completedAt: null,
    },
  });

  for (const task of linkedTasks) {
    const completedAt = new Date();
    const result = await tx.task.updateMany({
      where: { id: task.id, tenantId, version: task.version, status: "open" },
      data: {
        status: "completed",
        completedBy: actorId,
        completedAt,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new OptimisticLockError("Task", task.id);

    await audit.emit({
      tenantId,
      entityType: "Task",
      entityId: task.id,
      action: DomainEvents.TASK_COMPLETED,
      actorId,
      before: { status: task.status, version: task.version },
      after: { status: "completed", version: task.version + 1, requirementId: reqId },
    });
  }

  const [remaining, total, theCase] = await Promise.all([
    tx.authorizationRequirement.count({ where: { caseId, tenantId, required: true, completed: false } }),
    tx.authorizationRequirement.count({ where: { caseId, tenantId, required: true } }),
    tx.authorizationCase.findFirst({ where: { id: caseId, tenantId } }),
  ]);

  const autoTransitionFrom = ["docs_missing", "more_info_requested", "requirements_found"];
  if (remaining === 0 && total > 0 && theCase && autoTransitionFrom.includes(theCase.status)) {
    const result = await tx.authorizationCase.updateMany({
      where: { id: caseId, tenantId, version: theCase.version },
      data: { status: "ready_to_submit", version: { increment: 1 } },
    });
    if (result.count !== 1) throw new OptimisticLockError("AuthorizationCase", caseId);
    await audit.emit({
      tenantId,
      entityType: "AuthorizationCase",
      entityId: caseId,
      action: DomainEvents.CASE_STATUS_CHANGED,
      actorId,
      before: { status: theCase.status, version: theCase.version },
      after: { status: "ready_to_submit" },
    });
  }

  return requirement;
}

export class RequirementsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async discoverRequirements(tenantId: string, caseId: string, actorId: string) {
    const authCase = await withTenant(this.db, tenantId, (tx) =>
      tx.authorizationCase.findFirstOrThrow({ where: { id: caseId, tenantId } })
    );

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
      return withTenant(this.db, tenantId, async (tx) => {
        const current = await tx.authorizationCase.findFirstOrThrow({ where: { id: caseId, tenantId } });
        assertValidTransition(current.status, "closed");
        const result = await tx.authorizationCase.updateMany({
          where: { id: caseId, tenantId, version: current.version },
          data: { status: "closed", version: { increment: 1 } },
        });
        if (result.count !== 1) throw new OptimisticLockError("AuthorizationCase", caseId);
        await new AuditService(tx).emit({
          tenantId,
          entityType: "AuthorizationCase",
          entityId: caseId,
          action: DomainEvents.CASE_STATUS_CHANGED,
          actorId,
          before: { status: current.status, version: current.version },
          after: { status: "closed", reason: "authorization_not_required" },
        });
        return { authRequired: false, requirements: [] };
      });
    }

    const hasIncomplete = crd.requirements.some((r) => r.required);
    const nextStatus = hasIncomplete ? "docs_missing" : "requirements_found";

    return withTenant(this.db, tenantId, async (tx) => {
      const current = await tx.authorizationCase.findFirstOrThrow({ where: { id: caseId, tenantId } });
      assertValidTransition(current.status, nextStatus);

      const created = await tx.authorizationRequirement.createMany({
        data: crd.requirements.map((r) => ({
          caseId,
          tenantId,
          description: r.description,
          required: r.required,
          source: "crd" as const,
        })),
        skipDuplicates: true,
      });

      const result = await tx.authorizationCase.updateMany({
        where: { id: caseId, tenantId, version: current.version },
        data: { status: nextStatus, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new OptimisticLockError("AuthorizationCase", caseId);

      await tx.task.updateMany({
        where: { caseId, tenantId, type: "review", completedAt: null },
        data: { completedAt: new Date(), status: "completed", version: { increment: 1 } },
      });

      await new AuditService(tx).emit({
        tenantId,
        entityType: "AuthorizationCase",
        entityId: caseId,
        action: DomainEvents.REQUIREMENTS_DISCOVERED,
        actorId,
        before: { status: current.status, version: current.version },
        after: { requirementsCount: created.count, status: nextStatus },
      });

      return { authRequired: true, requirements: crd.requirements };
    });
  }

  async getRequirements(tenantId: string, caseId: string) {
    return withTenant(this.db, tenantId, (tx) => tx.authorizationRequirement.findMany({
      where: { caseId, tenantId },
      orderBy: { required: "desc" },
    }));
  }

  async completeRequirement(tenantId: string, caseId: string, reqId: string, actorId: string) {
    return withTenant(this.db, tenantId, (tx) =>
      completeRequirementInTransaction(tx, tenantId, caseId, reqId, actorId)
    );
  }
}
