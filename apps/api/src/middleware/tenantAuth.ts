import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type ms from "ms";
import jwksClient from "jwks-rsa";

export interface TokenClaims {
  sub: string;
  tenantId: string;
  role: string;
  email?: string;
}

const JWT_SECRET = process.env["JWT_SECRET"] ?? "change_me";

const jwksClients = new Map<string, jwksClient.JwksClient>();

function getJwksClient(jwksUri: string): jwksClient.JwksClient {
  let client = jwksClients.get(jwksUri);
  if (!client) {
    client = jwksClient({ jwksUri, cache: true, rateLimit: true });
    jwksClients.set(jwksUri, client);
  }
  return client;
}

function getSigningKey(jwksUri: string, kid: string): Promise<string> {
  const client = getJwksClient(jwksUri);
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error("No signing key found"));
      resolve(key.getPublicKey());
    });
  });
}

async function verifyJwt(token: string, jwksUri?: string): Promise<TokenClaims> {
  if (jwksUri) {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string") throw new Error("Malformed token");
    const kid = decoded.header.kid;
    if (!kid) throw new Error("Token missing kid header");
    const publicKey = await getSigningKey(jwksUri, kid);
    return jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as TokenClaims;
  }
  return jwt.verify(token, JWT_SECRET) as TokenClaims;
}

/**
 * Tenant-aware auth middleware.
 *
 * Supports two modes:
 * 1. Bearer JWT — extracts tenantId/userId/role from token claims
 * 2. Legacy x-tenant-id header — allows internal/worker calls with a shared secret
 *
 * Internal callers (workers) may pass x-internal-secret to bypass JWT.
 */
export function tenantAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const internalSecret = req.headers["x-internal-secret"];

  if (internalSecret && internalSecret === process.env["INTERNAL_SECRET"]) {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId || typeof tenantId !== "string") {
      res.status(401).json({ error: "Missing tenant context on internal call" });
      return;
    }
    res.locals["tenantId"] = tenantId;
    res.locals["userId"] = "system";
    res.locals["userRole"] = "admin";
    next();
    return;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const tenantId = req.headers["x-tenant-id"];
    if (tenantId && typeof tenantId === "string") {
      res.locals["tenantId"] = tenantId;
      res.locals["userId"] = "system";
      res.locals["userRole"] = "admin";
      next();
      return;
    }
    res.status(401).json({ error: "Missing authorization" });
    return;
  }

  const token = authHeader.slice(7);

  verifyJwt(token)
    .then((claims) => {
      res.locals["tenantId"] = claims.tenantId;
      res.locals["userId"] = claims.sub;
      res.locals["userRole"] = claims.role;
      next();
    })
    .catch(() => {
      res.status(401).json({ error: "Invalid or expired token" });
    });
}

export function signJwt(claims: TokenClaims, expiresIn: ms.StringValue = "8h"): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn });
}
