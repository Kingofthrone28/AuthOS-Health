import { Router } from "express";
import { ctx } from "../lib/context.js";
import { ApiError } from "../middleware/errorHandler.js";

export const attachmentsRouter = Router();

// POST /api/cases/:id/attachments
// Expects multipart/form-data with a "file" field.
// Uses express.raw() — caller must set Content-Type to application/octet-stream for simple uploads,
// or wire multer for multipart. For now accepts raw body for simplicity.
attachmentsRouter.post("/:id/attachments", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const { fileName, mimeType } = req.query as { fileName?: string; mimeType?: string };
    if (!fileName) throw new ApiError(400, "fileName query param is required");

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const attachment = await ctx.attachmentService.uploadAttachment(tenantId, req.params["id"]!, {
      fileName,
      mimeType:   mimeType ?? "application/octet-stream",
      sizeBytes:  buffer.length,
      buffer,
      uploadedBy: res.locals["userId"] as string ?? "system",
    });

    res.status(201).json(attachment);
  } catch (err) { next(err); }
});

// GET /api/cases/:id/attachments
attachmentsRouter.get("/:id/attachments", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const attachments = await ctx.attachmentService.listAttachments(tenantId, req.params["id"]!);
    res.json(attachments);
  } catch (err) { next(err); }
});

// POST /api/cases/:id/attachments/classify
attachmentsRouter.post("/:id/attachments/classify", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const { attachmentId } = req.body as { attachmentId?: string };
    if (!attachmentId) throw new ApiError(400, "attachmentId is required");
    const result = await ctx.attachmentService.classifyAttachment(tenantId, attachmentId);
    res.json(result);
  } catch (err) { next(err); }
});
