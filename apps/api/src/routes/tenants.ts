import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../middleware/requireRole.js";
import { ctx } from "../lib/context.js";

export const tenantsRouter = Router();

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  adminName: z.string().min(1),
  adminPassword: z.string().min(8).optional(),
});

tenantsRouter.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const body = createTenantSchema.parse(req.body);
    const result = await ctx.tenantService.create(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

tenantsRouter.get("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const tenant = await ctx.tenantService.getById(req.params["id"]!);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(tenant);
  } catch (err) {
    next(err);
  }
});

const updateSettingsSchema = z.object({
  ssoProvider: z.enum(["oidc", "saml"]).nullable().optional(),
  ssoIssuerUrl: z.string().url().nullable().optional(),
  ssoClientId: z.string().nullable().optional(),
  ssoClientSecret: z.string().nullable().optional(),
  fhirServerUrl: z.string().url().nullable().optional(),
  payerEndpoint: z.string().url().nullable().optional(),
  retentionDays: z.number().int().min(30).optional(),
});

tenantsRouter.patch("/:id/settings", requireRole("admin"), async (req, res, next) => {
  try {
    const body = updateSettingsSchema.parse(req.body);
    const actorId = res.locals["userId"] as string;
    const settings = await ctx.tenantService.updateSettings(req.params["id"]!, body, actorId);
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

tenantsRouter.get("/:id/users", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const users = await ctx.tenantService.listUsers(req.params["id"]!);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "clinician", "auth_specialist", "manager", "read_only"]).optional(),
  password: z.string().min(8).optional(),
});

tenantsRouter.post("/:id/users", requireRole("admin"), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const actorId = res.locals["userId"] as string;
    const user = await ctx.tenantService.createUser(req.params["id"]!, body, actorId);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});
