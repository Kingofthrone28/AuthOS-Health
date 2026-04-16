import { Router } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
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
    const attachment = await ctx.attachmentService.getAttachment(tenantId, req.params["id"]!);
    if (!attachment) throw new ApiError(404, "Attachment not found");

    const filePath = path.resolve(attachment.storageRef);
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      throw new ApiError(404, "File not found on disk");
    }

    const stat = await fs.promises.stat(filePath);
    res.setHeader("Content-Type", attachment.mimeType ?? "application/octet-stream");
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
    );

    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
});
