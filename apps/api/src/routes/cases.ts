import { Router } from "express";
import { z } from "zod";
import { ctx } from "../lib/context.js";
import { ApiError } from "../middleware/errorHandler.js";

export const casesRouter = Router();

const CreateCaseSchema = z.object({
  patientRefId:  z.string(),
  coverageRefId: z.string(),
  serviceType:   z.string(),
  serviceCode:   z.string().optional(),
  priority:      z.enum(["standard", "expedited", "urgent"]),
  payerName:     z.string(),
  orderRefId:    z.string().optional(),
});

// POST /api/cases
casesRouter.post("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const body = CreateCaseSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, body.error.message);

    const authCase = await ctx.caseService.createCase(tenantId, {
      ...body.data,
      orderRefId:  body.data.orderRefId,
      serviceCode: body.data.serviceCode,
      createdBy:   res.locals["userId"] as string ?? "system",
    });

    res.status(201).json(authCase);
  } catch (err) { next(err); }
});

// GET /api/cases
casesRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const { status, assignedTo, q } = req.query as Record<string, string | undefined>;

    const cases = await ctx.caseService.listCases(tenantId, { status, assignedTo, q });
    res.json(cases);
  } catch (err) { next(err); }
});

// GET /api/cases/:id
casesRouter.get("/:id", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const authCase = await ctx.caseService.getCase(tenantId, req.params["id"]!);
    if (!authCase) throw new ApiError(404, "Case not found");
    res.json(authCase);
  } catch (err) { next(err); }
});

// PATCH /api/cases/:id
casesRouter.patch("/:id", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const { status } = req.body as { status?: string };
    if (status) {
      const updated = await ctx.caseService.updateStatus(
        tenantId, req.params["id"]!, status as never,
        res.locals["userId"] as string ?? "system"
      );
      res.json(updated);
    } else {
      throw new ApiError(400, "Only status updates are supported via PATCH");
    }
  } catch (err) { next(err); }
});

// POST /api/cases/:id/assign
casesRouter.post("/:id/assign", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const { assignedTo } = req.body as { assignedTo?: string };
    if (!assignedTo) throw new ApiError(400, "assignedTo is required");

    const updated = await ctx.caseService.assignCase(
      tenantId, req.params["id"]!, assignedTo,
      res.locals["userId"] as string ?? "system"
    );
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/cases/:id/close
casesRouter.post("/:id/close", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const updated = await ctx.caseService.closeCase(
      tenantId, req.params["id"]!,
      res.locals["userId"] as string ?? "system"
    );
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/cases/:id/escalate
casesRouter.post("/:id/escalate", async (req, res, next) => {
  try {
    // TODO: Phase 3 — trigger escalation workflow
    res.json({ id: req.params["id"], escalated: true });
  } catch (err) { next(err); }
});
