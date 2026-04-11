import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../middleware/requireRole.js";
import { ctx } from "../lib/context.js";

export const auditRouter = Router();

const querySchema = z.object({
  entityType: z.string().optional(),
  actorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

auditRouter.get("/events", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const filters = querySchema.parse(req.query);

    const result = await ctx.auditExportService.query({
      tenantId,
      entityType: filters.entityType,
      actorId: filters.actorId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      cursor: filters.cursor,
      limit: filters.limit,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

const exportSchema = z.object({
  entityType: z.string().optional(),
  actorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

auditRouter.get("/export/csv", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const filters = exportSchema.parse(req.query);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-${tenantId}-${Date.now()}.csv"`);

    const stream = ctx.auditExportService.streamCsv({
      tenantId,
      entityType: filters.entityType,
      actorId: filters.actorId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

auditRouter.get("/export/json", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const filters = exportSchema.parse(req.query);

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Content-Disposition", `attachment; filename="audit-${tenantId}-${Date.now()}.ndjson"`);

    const stream = ctx.auditExportService.streamNdjson({
      tenantId,
      entityType: filters.entityType,
      actorId: filters.actorId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});
