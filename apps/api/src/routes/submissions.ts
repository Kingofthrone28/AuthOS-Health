import { Router } from "express";

export const submissionsRouter = Router();

// POST /api/cases/:id/build-submission
submissionsRouter.post("/:id/build-submission", async (req, res, next) => {
  try {
    // TODO: build submission packet via payer-adapters
    res.json({ caseId: req.params["id"], status: "packet_built" });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/submit
submissionsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    // TODO: submit to payer via payer adapter, store Submission record
    res.json({ caseId: req.params["id"], status: "submitted" });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id/submissions
submissionsRouter.get("/:id/submissions", async (req, res, next) => {
  try {
    // TODO: list submissions for case
    res.json({ caseId: req.params["id"], submissions: [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/resubmit
submissionsRouter.post("/:id/resubmit", async (req, res, next) => {
  try {
    // TODO: resubmit case (appeal path)
    res.json({ caseId: req.params["id"], status: "resubmitted" });
  } catch (err) {
    next(err);
  }
});
