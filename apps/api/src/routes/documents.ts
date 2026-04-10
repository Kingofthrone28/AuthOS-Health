import { Router } from "express";
import { ctx } from "../lib/context.js";

export const documentsRouter = Router();

// GET /api/documents — all attachments for the tenant across all cases
documentsRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const docs = await ctx.attachmentService.listAllForTenant(tenantId);
    res.json(docs);
  } catch (err) { next(err); }
});
