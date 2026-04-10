import { Router } from "express";

export const requirementsRouter = Router();

// POST /api/cases/:id/check-requirements
requirementsRouter.post("/:id/check-requirements", async (req, res, next) => {
  try {
    // TODO: trigger CRD/DTR requirements check
    res.json({ caseId: req.params["id"], status: "requirements_check_initiated" });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id/requirements
requirementsRouter.get("/:id/requirements", async (req, res, next) => {
  try {
    // TODO: fetch requirements for case
    res.json({ caseId: req.params["id"], requirements: [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/requirements/:reqId/complete
requirementsRouter.post("/:id/requirements/:reqId/complete", async (req, res, next) => {
  try {
    // TODO: mark requirement complete and emit audit event
    res.json({ caseId: req.params["id"], requirementId: req.params["reqId"], completed: true });
  } catch (err) {
    next(err);
  }
});
