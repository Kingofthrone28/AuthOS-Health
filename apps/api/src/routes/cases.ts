import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../middleware/errorHandler.js";

export const casesRouter = Router();

const CreateCaseSchema = z.object({
  patientRefId: z.string(),
  coverageRefId: z.string(),
  serviceType: z.string(),
  serviceCode: z.string().optional(),
  priority: z.enum(["standard", "expedited", "urgent"]),
  payerName: z.string(),
  orderRefId: z.string().optional(),
  encounterRefId: z.string().optional(),
});

// POST /api/cases
casesRouter.post("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const body = CreateCaseSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, body.error.message);

    // TODO: wire to case service / database
    res.status(201).json({ tenantId, ...body.data, id: "stub", status: "new" });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases
casesRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const { status, assignedTo, q } = req.query;
    // TODO: query case service with filters
    res.json({ tenantId, filters: { status, assignedTo, q }, cases: [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id
casesRouter.get("/:id", async (req, res, next) => {
  try {
    // TODO: fetch single case
    res.json({ id: req.params["id"] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cases/:id
casesRouter.patch("/:id", async (req, res, next) => {
  try {
    // TODO: update case fields
    res.json({ id: req.params["id"], ...req.body });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/assign
casesRouter.post("/:id/assign", async (req, res, next) => {
  try {
    const { assignedTo } = req.body as { assignedTo: string };
    if (!assignedTo) throw new ApiError(400, "assignedTo is required");
    // TODO: assign case
    res.json({ id: req.params["id"], assignedTo });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/close
casesRouter.post("/:id/close", async (req, res, next) => {
  try {
    // TODO: close case with state transition
    res.json({ id: req.params["id"], status: "closed" });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/escalate
casesRouter.post("/:id/escalate", async (req, res, next) => {
  try {
    // TODO: escalate case
    res.json({ id: req.params["id"], escalated: true });
  } catch (err) {
    next(err);
  }
});
