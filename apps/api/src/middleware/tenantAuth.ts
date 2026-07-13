import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import type ms from "ms";
import jwksClient from "jwks-rsa";

export interface TokenClaims {
  sub: string;
  tenantId: string;
  role: string;
  email?: string;
}

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) throw new Error("JWT_SECRET must be configured");
  if (process.env["NODE_ENV"] === "production" && secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  return secret;
}

function secretsMatch(candidate: string | undefined, expected: string | undefined): boolean {
  if (!candidate || !expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer);
}

function parseClaims(value: string | jwt.JwtPayload): TokenClaims {
  if (typeof value !== "object" ||
      typeof value.sub !== "string" ||
      typeof value.tenantId !== "string" ||
      typeof value.role !== "string" ||
      value.sub.length === 0 ||
      value.tenantId.length === 0 ||
      value.role.length === 0) {
    throw new Error("Token is missing required claims");
  }

  return {
    sub: value.sub,
    tenantId: value.tenantId,
    role: value.role,
    ...(typeof value.email === "string" ? { email: value.email } : {}),
  };
}

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
    return parseClaims(jwt.verify(token, publicKey, { algorithms: ["RS256"] }));
  }
  return parseClaims(jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }));
}

/**
 * Tenant-aware auth middleware.
 *
 * Supports two authenticated modes:
 * 1. Bearer JWT — extracts tenantId/userId/role from token claims
 * 2. Internal callers — require the shared secret and an explicit tenant context
 */
export function tenantAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const internalSecret = req.headers["x-internal-secret"];

  if (typeof internalSecret === "string" && secretsMatch(internalSecret, process.env["INTERNAL_SECRET"])) {
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
  return jwt.sign(claims, getJwtSecret(), { algorithm: "HS256", expiresIn });
}

export function validateSecurityConfiguration(): void {
  if (process.env["NODE_ENV"] !== "production") return;
  getJwtSecret();
  if (!process.env["INTERNAL_SECRET"] || process.env["INTERNAL_SECRET"]!.length < 32) {
    throw new Error("INTERNAL_SECRET must be at least 32 characters in production");
  }
  if (!process.env["TENANT_ENCRYPTION_KEY"] || process.env["TENANT_ENCRYPTION_KEY"]!.length < 32) {
    throw new Error("TENANT_ENCRYPTION_KEY must be at least 32 characters in production");
  }
}
