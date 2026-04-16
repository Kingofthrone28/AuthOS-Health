import { Router } from "express";
import { ctx } from "../lib/context.js";

export const analyticsRouter = Router();

// GET /api/analytics/kpi — dashboard summary counts
analyticsRouter.get("/kpi", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const kpi = await ctx.analyticsService.kpiSummary(tenantId);
    res.json(kpi);
  } catch (err) { next(err); }
});

// GET /api/analytics/turnaround
analyticsRouter.get("/turnaround", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const metrics = await ctx.analyticsService.turnaroundMetrics(tenantId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/denials
analyticsRouter.get("/denials", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const metrics = await ctx.analyticsService.denialMetrics(tenantId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/payers
analyticsRouter.get("/payers", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const metrics = await ctx.analyticsService.payerMetrics(tenantId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/staff
analyticsRouter.get("/staff", async (req, res, next) => {
  try {
    const tenantId = res.locals["tenantId"] as string;
    const metrics = await ctx.analyticsService.staffMetrics(tenantId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});
