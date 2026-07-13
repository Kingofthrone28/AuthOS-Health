import type { PrismaClient, CaseStatus, CasePriority } from "@prisma/client";
import { assertValidTransition, calculateDueAt, DomainEvents } from "@authos/domain";
import type { AuthorizationCaseStatus } from "@authos/shared-types";
import { AuditService } from "./auditService.js";
import { withTenant } from "../lib/prisma.js";
import { OptimisticLockError } from "./errors.js";

export interface CreateCaseInput {
  patientRefId: string;
  coverageRefId: string;
  orderRefId: string | undefined;
  serviceType: string;
  serviceCode: string | undefined;
  priority: CasePriority;
  payerName: string;
  createdBy: string;
}

export interface ListCasesFilters {
  status: string | undefined;
  assignedTo: string | undefined;
  q: string | undefined;
}

export class CaseService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async createCase(tenantId: string, input: CreateCaseInput) {
    const dueAt = calculateDueAt(input.priority as "standard" | "expedited" | "urgent");

    return withTenant(this.db, tenantId, async (tx) => {
      const [patient, coverage, order] = await Promise.all([
        tx.patientRef.findFirst({ where: { id: input.patientRefId, tenantId } }),
        tx.coverageRef.findFirst({ where: { id: input.coverageRefId, tenantId } }),
        input.orderRefId
          ? tx.orderRef.findFirst({ where: { id: input.orderRefId, tenantId } })
          : Promise.resolve(null),
      ]);

      if (!patient || !coverage || (input.orderRefId && !order)) {
        throw new Error("Case references must belong to the authenticated tenant");
      }
      if (coverage.patientRefId !== patient.id || (order && order.patientRefId !== patient.id)) {
        throw new Error("Case references do not belong to the same patient");
      }

      const authCase = await tx.authorizationCase.create({
        data: {
          tenantId,
          patientRefId:  input.patientRefId,
          coverageRefId: input.coverageRefId,
          orderRefId:    input.orderRefId ?? null,
          serviceType:   input.serviceType,
          serviceCode:   input.serviceCode ?? null,
          priority:      input.priority,
          payerName:     input.payerName,
          createdBy:     input.createdBy,
          dueAt,
          status:        "new",
        },
      });

      await new AuditService(tx).emit({
        tenantId,
        entityType: "AuthorizationCase",
        entityId:   authCase.id,
        action:     DomainEvents.CASE_CREATED,
        actorId:    input.createdBy,
        after:      authCase as unknown as Record<string, unknown>,
      });

      return authCase;
    });
  }

  async listCases(tenantId: string, filters: ListCasesFilters) {
    return withTenant(this.db, tenantId, (tx) => tx.authorizationCase.findMany({
      where: {
        tenantId,
        ...(filters.status && filters.status !== "all"
          ? { status: filters.status as CaseStatus }
          : {}),
        ...(filters.assignedTo ? { assignedTo: filters.assignedTo } : {}),
        ...(filters.q
          ? {
              OR: [
                { serviceType: { contains: filters.q, mode: "insensitive" } },
                { payerName:   { contains: filters.q, mode: "insensitive" } },
                { patient:     { name: { contains: filters.q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { patient: true, coverage: true },
      orderBy: { dueAt: "asc" },
    }));
  }

  async getCase(tenantId: string, id: string) {
    return withTenant(this.db, tenantId, (tx) => tx.authorizationCase.findFirst({
      where: { id, tenantId },
      include: {
        patient:      true,
        coverage:     true,
        requirements: true,
        submissions:  { include: { responses: true } },
        attachments:  true,
        tasks:        { where: { status: "open", completedAt: null } },
      },
    }));
  }

  async updateStatus(tenantId: string, id: string, newStatus: AuthorizationCaseStatus, actorId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const existing = await tx.authorizationCase.findFirstOrThrow({ where: { id, tenantId } });
      assertValidTransition(existing.status as AuthorizationCaseStatus, newStatus);

      const result = await tx.authorizationCase.updateMany({
        where: { id, tenantId, version: existing.version },
        data: { status: newStatus as CaseStatus, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new OptimisticLockError("AuthorizationCase", id);

      const updated = await tx.authorizationCase.findUniqueOrThrow({ where: { id } });
      await new AuditService(tx).emit({
        tenantId,
        entityType: "AuthorizationCase",
        entityId:   id,
        action:     DomainEvents.CASE_STATUS_CHANGED,
        actorId,
        before:     { status: existing.status, version: existing.version },
        after:      { status: newStatus, version: updated.version },
      });

      return updated;
    });
  }

  async assignCase(tenantId: string, id: string, assignedTo: string, actorId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const existing = await tx.authorizationCase.findFirstOrThrow({ where: { id, tenantId } });
      const result = await tx.authorizationCase.updateMany({
        where: { id, tenantId, version: existing.version },
        data: { assignedTo, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new OptimisticLockError("AuthorizationCase", id);

      const updated = await tx.authorizationCase.findUniqueOrThrow({ where: { id } });
      await new AuditService(tx).emit({
        tenantId,
        entityType: "AuthorizationCase",
        entityId:   id,
        action:     DomainEvents.CASE_ASSIGNED,
        actorId,
        before:     { assignedTo: existing.assignedTo, version: existing.version },
        after:      { assignedTo, version: updated.version },
      });

      return updated;
    });
  }

  async closeCase(tenantId: string, id: string, actorId: string) {
    return this.updateStatus(tenantId, id, "closed", actorId);
  }
}
