import type { PrismaClient } from "@prisma/client";
import { DomainEvents } from "@authos/domain";
import type { AuditService } from "./auditService.js";

export interface ListTasksFilters {
  assignedTo?: string | undefined;
  caseId?: string | undefined;
  status?: string | undefined;
}

export interface CreateTaskInput {
  caseId: string;
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
    return this.db.task.findMany({
      where: {
        tenantId,
        ...(filters.caseId ? { caseId: filters.caseId } : {}),
        ...(filters.assignedTo ? { assignedTo: filters.assignedTo } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTask(tenantId: string, input: CreateTaskInput, actorId?: string) {
    const task = await this.db.task.create({
      data: {
        tenantId,
        caseId: input.caseId,
        type: input.type,
        description: input.description,
        assignedTo: input.assignedTo ?? null,
        dueAt: input.dueAt ?? null,
        status: "open",
      },
    });

    await this.audit.emit({
      tenantId,
      entityType: "Task",
      entityId: task.id,
      action: DomainEvents.TASK_CREATED,
      ...(actorId ? { actorId } : {}),
      after: { type: input.type, caseId: input.caseId },
    });

    return task;
  }

  async completeTask(tenantId: string, taskId: string, completedBy: string) {
    const task = await this.db.task.update({
      where: { id: taskId, tenantId },
      data: {
        status: "completed",
        completedBy,
        completedAt: new Date(),
      },
    });

    await this.audit.emit({
      tenantId,
      entityType: "Task",
      entityId: taskId,
      action: DomainEvents.TASK_COMPLETED,
      actorId: completedBy,
      after: { status: "completed" },
    });

    return task;
  }

  async cancelTask(tenantId: string, taskId: string, actorId?: string) {
    const task = await this.db.task.update({
      where: { id: taskId, tenantId },
      data: { status: "cancelled" },
    });

    await this.audit.emit({
      tenantId,
      entityType: "Task",
      entityId: taskId,
      action: "task.cancelled",
      ...(actorId ? { actorId } : {}),
      after: { status: "cancelled" },
    });

    return task;
  }
}
