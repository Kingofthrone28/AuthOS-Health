import { Router } from "express";

export const attachmentsRouter = Router();

// POST /api/cases/:id/attachments
attachmentsRouter.post("/:id/attachments", async (req, res, next) => {
  try {
    // TODO: handle multipart upload, store to blob, persist Attachment record
    res.status(201).json({ caseId: req.params["id"], uploaded: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id/attachments
attachmentsRouter.get("/:id/attachments", async (req, res, next) => {
  try {
    // TODO: list attachments for case
    res.json({ caseId: req.params["id"], attachments: [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/attachments/classify
attachmentsRouter.post("/:id/attachments/classify", async (req, res, next) => {
  try {
    // TODO: trigger document classification for unclassified attachments
    res.json({ caseId: req.params["id"], classification: "initiated" });
  } catch (err) {
    next(err);
  }
});
