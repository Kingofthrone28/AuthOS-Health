import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@authos/shared-types";

export function requireRole(...allowed: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const role = res.locals["userRole"] as string | undefined;
    if (!role || !allowed.includes(role as UserRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
