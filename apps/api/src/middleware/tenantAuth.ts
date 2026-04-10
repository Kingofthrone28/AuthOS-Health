import type { Request, Response, NextFunction } from "express";

// Placeholder tenant-aware auth middleware.
// Replace with real JWT/SMART token validation against your identity provider.
export function tenantAuth(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.headers["x-tenant-id"];
  if (!tenantId || typeof tenantId !== "string") {
    res.status(401).json({ error: "Missing or invalid tenant context" });
    return;
  }
  // Attach tenantId to request for downstream use
  res.locals["tenantId"] = tenantId;
  next();
}
