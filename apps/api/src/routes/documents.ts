import { Router } from "express";
import { ctx } from "../lib/context.js";
import { ApiError } from "../middleware/errorHandler.js";

export const documentsRouter = Router();

// GET /api/documents — all attachments for the tenant across all cases
documentsRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const docs = await ctx.attachmentService.listAllForTenant(tenantId);
    res.json(docs);
  } catch (err) { next(err); }
});

// GET /api/documents/:id/download — stream the file back to the caller
documentsRouter.get("/:id/download", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const result = await ctx.attachmentService.readAttachment(tenantId, req.params["id"]!);
    if (!result) throw new ApiError(404, "Attachment not found");

    res.setHeader("Content-Type", result.attachment.mimeType ?? "application/octet-stream");
    res.setHeader("Content-Length", result.content.length);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.attachment.fileName)}"`,
    );
    res.send(result.content);
  } catch (err) { next(err); }
});
