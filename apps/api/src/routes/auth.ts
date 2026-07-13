import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { getPrismaClient } from "../lib/prisma.js";
import { withTenant } from "../lib/prisma.js";
import { signJwt } from "../middleware/tenantAuth.js";
import {
  discoverOidcProvider,
  exchangeOidcCode,
  verifyOidcToken,
  buildOidcAuthorizeUrl,
} from "../lib/oidc.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
});

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getTenantSettings(db: ReturnType<typeof getPrismaClient>, tenantId: string) {
  return withTenant(db, tenantId, (tx) => tx.tenantSettings.findUnique({ where: { tenantId } }));
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password, tenantSlug } = loginSchema.parse(req.body);
    const db = getPrismaClient();

    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = await withTenant(db, tenant.id, (tx) => tx.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    }));
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signJwt({
      sub: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = crypto.randomBytes(48).toString("hex");
    await withTenant(db, tenant.id, (tx) => tx.refreshToken.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    }));

    res.json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    });
  } catch (err) {
    next(err);
  }
});

const oidcAuthorizeSchema = z.object({
  tenantSlug: z.string().min(1),
  redirectUri: z.string().url(),
});

authRouter.get("/oidc/authorize", async (req, res, next) => {
  try {
    const { tenantSlug, redirectUri } = oidcAuthorizeSchema.parse(req.query);
    const db = getPrismaClient();

    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    const settings = tenant ? await getTenantSettings(db, tenant.id) : null;
    if (!tenant || !settings?.ssoIssuerUrl || !settings.ssoClientId) {
      res.status(400).json({ error: "SSO not configured for this tenant" });
      return;
    }

    const config = await discoverOidcProvider(settings.ssoIssuerUrl);
    const state = Buffer.from(JSON.stringify({
      tenantId: tenant.id,
      redirectUri,
    })).toString("base64url");

    const authorizeUrl = buildOidcAuthorizeUrl(
      settings.ssoIssuerUrl,
      config.authorization_endpoint,
      settings.ssoClientId,
      redirectUri,
      state,
    );

    res.redirect(authorizeUrl);
  } catch (err) {
    next(err);
  }
});

const oidcCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

authRouter.get("/oidc/callback", async (req, res, next) => {
  try {
    const { code, state } = oidcCallbackSchema.parse(req.query);
    const db = getPrismaClient();

    const stateData = JSON.parse(Buffer.from(state, "base64url").toString()) as {
      tenantId: string;
      redirectUri: string;
    };

    const tenant = await db.tenant.findUnique({ where: { id: stateData.tenantId } });
    const settings = tenant ? await getTenantSettings(db, tenant.id) : null;
    if (!tenant || !settings?.ssoIssuerUrl || !settings.ssoClientId || !settings.ssoClientSecret) {
      res.status(400).json({ error: "SSO configuration incomplete" });
      return;
    }

    const tokenResponse = await exchangeOidcCode(
      settings.ssoIssuerUrl,
      settings.ssoClientId,
      settings.ssoClientSecret,
      code,
      stateData.redirectUri,
    );

    const claims = await verifyOidcToken(
      tokenResponse.id_token,
      settings.ssoIssuerUrl,
      settings.ssoClientId,
    );

    const email = claims.email;
    if (!email) {
      res.status(400).json({ error: "ID token missing email claim" });
      return;
    }

    let user = await withTenant(db, tenant.id, (tx) => tx.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    }));

    if (!user) {
      user = await withTenant(db, tenant.id, (tx) => tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name: (claims.name as string) ?? email,
          role: "auth_specialist",
        },
      }));
    }

    const jwt = signJwt({
      sub: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    const callbackUrl = new URL(stateData.redirectUri);
    callbackUrl.searchParams.set("token", jwt);
    callbackUrl.searchParams.set("tenantId", tenant.id);

    res.redirect(callbackUrl.toString());
  } catch (err) {
    next(err);
  }
});

// ─── SAML endpoints ─────────────────────────────────────────────────────────

authRouter.get("/saml/login", async (req, res, next) => {
  try {
    const tenantSlug = z.string().min(1).parse(req.query["tenantSlug"]);
    const redirectUri = z.string().url().parse(req.query["redirectUri"]);
    const db = getPrismaClient();

    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    const settings = tenant ? await getTenantSettings(db, tenant.id) : null;
    if (!tenant || settings?.ssoProvider !== "saml") {
      res.status(400).json({ error: "SAML not configured for this tenant" });
      return;
    }
    if (!settings.ssoIssuerUrl || !settings.ssoClientSecret) {
      res.status(400).json({ error: "SAML configuration incomplete" });
      return;
    }

    const { createSamlClient, getLoginUrl } = await import("../lib/saml.js");

    const WEB_URL = process.env["WEB_URL"] ?? "http://localhost:3000";
    const saml = createSamlClient({
      entryPoint: settings.ssoIssuerUrl,
      issuer: `${WEB_URL}/saml/metadata/${tenant.slug}`,
      cert: settings.ssoClientSecret,
      callbackUrl: `${process.env["API_URL"] ?? "http://localhost:3001"}/auth/saml/callback`,
    });

    const relayState = Buffer.from(JSON.stringify({
      tenantId: tenant.id,
      redirectUri,
    })).toString("base64url");

    const loginUrl = await getLoginUrl(saml, relayState);
    res.redirect(loginUrl);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/saml/callback", async (req, res, next) => {
  try {
    const samlResponse = req.body.SAMLResponse as string;
    const relayState = req.body.RelayState as string;
    if (!samlResponse || !relayState) {
      res.status(400).json({ error: "Missing SAMLResponse or RelayState" });
      return;
    }

    const stateData = JSON.parse(Buffer.from(relayState, "base64url").toString()) as {
      tenantId: string;
      redirectUri: string;
    };

    const db = getPrismaClient();
    const tenant = await db.tenant.findUnique({ where: { id: stateData.tenantId } });
    const settings = tenant ? await getTenantSettings(db, tenant.id) : null;
    if (!tenant || !settings?.ssoIssuerUrl || !settings.ssoClientSecret) {
      res.status(400).json({ error: "SAML configuration incomplete" });
      return;
    }

    const { createSamlClient, validateSamlResponse } = await import("../lib/saml.js");

    const WEB_URL = process.env["WEB_URL"] ?? "http://localhost:3000";
    const saml = createSamlClient({
      entryPoint: settings.ssoIssuerUrl,
      issuer: `${WEB_URL}/saml/metadata/${tenant.slug}`,
      cert: settings.ssoClientSecret,
      callbackUrl: `${process.env["API_URL"] ?? "http://localhost:3001"}/auth/saml/callback`,
    });

    const profile = await validateSamlResponse(saml, { SAMLResponse: samlResponse });
    const email = profile.email ?? profile.nameID;

    let user = await withTenant(db, tenant.id, (tx) => tx.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    }));
    if (!user) {
      user = await withTenant(db, tenant.id, (tx) => tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || email,
          role: "auth_specialist",
        },
      }));
    }

    const token = signJwt({
      sub: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    const callbackUrl = new URL(stateData.redirectUri);
    callbackUrl.searchParams.set("token", token);
    callbackUrl.searchParams.set("tenantId", tenant.id);
    res.redirect(callbackUrl.toString());
  } catch (err) {
    next(err);
  }
});

authRouter.get("/saml/metadata/:tenantSlug", async (req, res, next) => {
  try {
    const tenantSlug = req.params["tenantSlug"]!;
    const db = getPrismaClient();

    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    const settings = tenant ? await getTenantSettings(db, tenant.id) : null;
    if (!tenant || !settings?.ssoIssuerUrl || !settings.ssoClientSecret) {
      res.status(404).json({ error: "SAML not configured" });
      return;
    }

    const { createSamlClient, generateSpMetadata } = await import("../lib/saml.js");

    const WEB_URL = process.env["WEB_URL"] ?? "http://localhost:3000";
    const saml = createSamlClient({
      entryPoint: settings.ssoIssuerUrl,
      issuer: `${WEB_URL}/saml/metadata/${tenant.slug}`,
      cert: settings.ssoClientSecret,
      callbackUrl: `${process.env["API_URL"] ?? "http://localhost:3001"}/auth/saml/callback`,
    });

    const metadata = generateSpMetadata(saml);
    res.type("application/xml").send(metadata);
  } catch (err) {
    next(err);
  }
});

// ─── Token refresh ──────────────────────────────────────────────────────────

authRouter.post("/token/refresh", async (req, res, next) => {
  try {
    const { refreshToken, tenantId, userId } = z.object({
      refreshToken: z.string().min(1),
      tenantId: z.string().min(1),
      userId: z.string().min(1),
    }).parse(req.body);

    const db = getPrismaClient();
    const stored = await withTenant(db, tenantId, (tx) => tx.refreshToken.findFirst({
      where: {
        tenantId,
        tokenHash: hashRefreshToken(refreshToken),
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    }));
    if (!stored) {
      res.status(401).json({ error: "Invalid refresh" });
      return;
    }

    const nextRefreshToken = crypto.randomBytes(48).toString("hex");
    await withTenant(db, tenantId, async (tx) => {
      await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      await tx.refreshToken.create({
        data: {
          tenantId,
          userId: stored.userId,
          tokenHash: hashRefreshToken(nextRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      });
    });

    const token = signJwt({
      sub: stored.user.id,
      tenantId,
      role: stored.user.role,
      email: stored.user.email,
    });

    res.json({ token, refreshToken: nextRefreshToken });
  } catch (err) {
    next(err);
  }
});
