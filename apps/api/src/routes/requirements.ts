import { Router } from "express";
import { ctx } from "../lib/context.js";

export const requirementsRouter = Router();

// POST /api/cases/:id/check-requirements
requirementsRouter.post("/:id/check-requirements", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const result = await ctx.requirementsService.discoverRequirements(
      tenantId, req.params["id"]!,
      res.locals["userId"] as string ?? "system"
    );
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/cases/:id/requirements
requirementsRouter.get("/:id/requirements", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const reqs = await ctx.requirementsService.getRequirements(tenantId, req.params["id"]!);
    res.json(reqs);
  } catch (err) { next(err); }
});

// POST /api/cases/:id/requirements/:reqId/complete
requirementsRouter.post("/:id/requirements/:reqId/complete", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const req_ = await ctx.requirementsService.completeRequirement(
      tenantId, req.params["id"]!, req.params["reqId"]!,
      res.locals["userId"] as string ?? "system"
    );
    res.json(req_);
  } catch (err) { next(err); }
});
