import { Router } from "express";
import { ctx } from "../lib/context.js";

export const submissionsRouter = Router();

// POST /api/cases/:id/build-submission
submissionsRouter.post("/:id/build-submission", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const caseId = req.params["id"]!;

    const packet = await ctx.submissionService.buildPacket(tenantId, caseId);
    res.json(packet);
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/submit
submissionsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const caseId = req.params["id"]!;
    const submittedBy = (res.locals["userId"] as string) ?? "system";

    const result = await ctx.submissionService.submit(tenantId, caseId, submittedBy);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id/submissions
submissionsRouter.get("/:id/submissions", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const caseId = req.params["id"]!;

    const submissions = await ctx.submissionService.listSubmissions(tenantId, caseId);
    res.json({ caseId, submissions });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/resubmit
submissionsRouter.post("/:id/resubmit", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const caseId = req.params["id"]!;
    const submittedBy = (res.locals["userId"] as string) ?? "system";

    const result = await ctx.submissionService.resubmit(tenantId, caseId, submittedBy);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
