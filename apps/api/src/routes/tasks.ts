import { Router } from "express";
import { ctx } from "../lib/context.js";

export const tasksRouter = Router();

// GET /api/tasks
tasksRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const { assignedTo, caseId, status } = req.query as Record<string, string | undefined>;

    const tasks = await ctx.taskService.listTasks(tenantId, { assignedTo, caseId, status });
    res.json({ tenantId, tasks });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks
tasksRouter.post("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const { caseId, type, description, assignedTo, dueAt } = req.body as {
      caseId: string;
      type: string;
      description: string;
      assignedTo?: string;
      dueAt?: string;
    };

    const task = await ctx.taskService.createTask(
      tenantId,
      { caseId, type, description, assignedTo, dueAt: dueAt ? new Date(dueAt) : undefined },
      (res.locals["userId"] as string) ?? "system"
    );
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/complete
tasksRouter.post("/:id/complete", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const completedBy = (res.locals["userId"] as string) ?? "system";

    const task = await ctx.taskService.completeTask(tenantId, req.params["id"]!, completedBy);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/cancel
tasksRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const task = await ctx.taskService.cancelTask(
      tenantId,
      req.params["id"]!,
      (res.locals["userId"] as string) ?? "system"
    );
    res.json(task);
  } catch (err) {
    next(err);
  }
});
