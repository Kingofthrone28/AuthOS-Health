import { Router } from "express";

export const tasksRouter = Router();

// GET /api/tasks
tasksRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    // TODO: fetch tasks for tenant, optionally filtered by assignedTo or caseId
    res.json({ tenantId, tasks: [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/complete
tasksRouter.post("/:id/complete", async (req, res, next) => {
  try {
    // TODO: mark task complete, emit audit event
    res.json({ id: req.params["id"], completed: true });
  } catch (err) {
    next(err);
  }
});
