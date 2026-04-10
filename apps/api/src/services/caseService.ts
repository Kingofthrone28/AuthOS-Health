import type { PrismaClient, CaseStatus, CasePriority } from "@prisma/client";
import { assertValidTransition, calculateDueAt, DomainEvents } from "@authos/domain";
import type { AuthorizationCaseStatus } from "@authos/shared-types";
import type { AuditService } from "./auditService.js";

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

    const authCase = await this.db.authorizationCase.create({
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

    await this.audit.emit({
      tenantId,
      entityType: "AuthorizationCase",
      entityId:   authCase.id,
      action:     DomainEvents.CASE_CREATED,
      actorId:    input.createdBy,
      after:      authCase as unknown as Record<string, unknown>,
    });

    return authCase;
  }

  async listCases(tenantId: string, filters: ListCasesFilters) {
    return this.db.authorizationCase.findMany({
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
    });
  }

  async getCase(tenantId: string, id: string) {
    return this.db.authorizationCase.findFirst({
      where: { id, tenantId },
      include: {
        patient:      true,
        coverage:     true,
        requirements: true,
        submissions:  { include: { responses: true } },
        attachments:  true,
        tasks:        { where: { completedAt: null } },
      },
    });
  }

  async updateStatus(tenantId: string, id: string, newStatus: AuthorizationCaseStatus, actorId: string) {
    const existing = await this.db.authorizationCase.findFirstOrThrow({ where: { id, tenantId } });
    assertValidTransition(
      existing.status as AuthorizationCaseStatus,
      newStatus
    );

    const updated = await this.db.authorizationCase.update({
      where: { id },
      data:  { status: newStatus as CaseStatus },
    });

    await this.audit.emit({
      tenantId,
      entityType: "AuthorizationCase",
      entityId:   id,
      action:     DomainEvents.CASE_STATUS_CHANGED,
      actorId,
      before:     { status: existing.status },
      after:      { status: newStatus },
    });

    return updated;
  }

  async assignCase(tenantId: string, id: string, assignedTo: string, actorId: string) {
    const updated = await this.db.authorizationCase.update({
      where: { id, tenantId },
      data:  { assignedTo },
    });

    await this.audit.emit({
      tenantId,
      entityType: "AuthorizationCase",
      entityId:   id,
      action:     DomainEvents.CASE_ASSIGNED,
      actorId,
      after:      { assignedTo },
    });

    return updated;
  }

  async closeCase(tenantId: string, id: string, actorId: string) {
    return this.updateStatus(tenantId, id, "closed", actorId);
  }
}
