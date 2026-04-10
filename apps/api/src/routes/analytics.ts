import { Router } from "express";

export const analyticsRouter = Router();

// GET /api/analytics/turnaround
analyticsRouter.get("/turnaround", async (req, res, next) => {
  try {
    res.json({ metric: "turnaround", data: [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/denials
analyticsRouter.get("/denials", async (req, res, next) => {
  try {
    res.json({ metric: "denials", data: [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/payers
analyticsRouter.get("/payers", async (req, res, next) => {
  try {
    res.json({ metric: "payers", data: [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/staff
analyticsRouter.get("/staff", async (req, res, next) => {
  try {
    res.json({ metric: "staff", data: [] });
  } catch (err) {
    next(err);
  }
});
