import type { PrismaClient } from "@prisma/client";
import { DomainEvents } from "@authos/domain";
import { AuditService } from "./auditService.js";
import { withTenant } from "../lib/prisma.js";
import { OptimisticLockError } from "./errors.js";

export interface ListTasksFilters {
  assignedTo?: string | undefined;
  caseId?: string | undefined;
  status?: string | undefined;
}

export interface CreateTaskInput {
  caseId: string;
  requirementId?: string | undefined;
  type: string;
  description: string;
  assignedTo?: string | undefined;
  dueAt?: Date | undefined;
}

export class TaskService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async listTasks(tenantId: string, filters: ListTasksFilters) {
    return withTenant(this.db, tenantId, (tx) => tx.task.findMany({
      where: {
        tenantId,
        ...(filters.caseId ? { caseId: filters.caseId } : {}),
        ...(filters.assignedTo ? { assignedTo: filters.assignedTo } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: "desc" },
    }));
  }

  async createTask(tenantId: string, input: CreateTaskInput, actorId?: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const authCase = await tx.authorizationCase.findFirst({ where: { id: input.caseId, tenantId } });
      if (!authCase) throw new Error("Case not found for tenant");

      if (input.requirementId) {
        const requirement = await tx.authorizationRequirement.findFirst({
          where: { id: input.requirementId, caseId: input.caseId, tenantId },
          select: { id: true },
        });
        if (!requirement) throw new Error("Requirement not found for case and tenant");
      }

      const task = await tx.task.create({
        data: {
          tenantId,
          caseId: input.caseId,
          requirementId: input.requirementId ?? null,
          type: input.type,
          description: input.description,
          assignedTo: input.assignedTo ?? null,
          dueAt: input.dueAt ?? null,
          status: "open",
        },
      });

      await new AuditService(tx).emit({
        tenantId,
        entityType: "Task",
        entityId: task.id,
        action: DomainEvents.TASK_CREATED,
        ...(actorId ? { actorId } : {}),
        after: {
          type: input.type,
          caseId: input.caseId,
          ...(input.requirementId ? { requirementId: input.requirementId } : {}),
        },
      });

      return task;
    });
  }

  async completeTask(tenantId: string, taskId: string, completedBy: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const existing = await tx.task.findFirstOrThrow({ where: { id: taskId, tenantId } });
      const result = await tx.task.updateMany({
        where: { id: taskId, tenantId, version: existing.version },
        data: { status: "completed", completedBy, completedAt: new Date(), version: { increment: 1 } },
      });
      if (result.count !== 1) throw new OptimisticLockError("Task", taskId);

      const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
      await new AuditService(tx).emit({
        tenantId,
        entityType: "Task",
        entityId: taskId,
        action: DomainEvents.TASK_COMPLETED,
        actorId: completedBy,
        before: { status: existing.status, version: existing.version },
        after: { status: "completed", version: task.version },
      });

      return task;
    });
  }

  async cancelTask(tenantId: string, taskId: string, actorId?: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const existing = await tx.task.findFirstOrThrow({ where: { id: taskId, tenantId } });
      const result = await tx.task.updateMany({
        where: { id: taskId, tenantId, version: existing.version },
        data: { status: "cancelled", version: { increment: 1 } },
      });
      if (result.count !== 1) throw new OptimisticLockError("Task", taskId);

      const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
      await new AuditService(tx).emit({
        tenantId,
        entityType: "Task",
        entityId: taskId,
        action: "task.cancelled",
        ...(actorId ? { actorId } : {}),
        before: { status: existing.status, version: existing.version },
        after: { status: "cancelled", version: task.version },
      });

      return task;
    });
  }
}
