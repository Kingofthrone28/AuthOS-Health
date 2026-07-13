import type { Request, Response, NextFunction } from "express";
import { InvalidTransitionError } from "@authos/domain";
import { OptimisticLockError } from "../services/errors.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err instanceof ApiError
    ? err.status
    : err instanceof InvalidTransitionError || err instanceof OptimisticLockError
      ? 409
      : 500;

  if (status >= 500) {
    const error = err instanceof Error ? err : new Error("Unknown server error");
    console.error(JSON.stringify({ name: error.name, stack: error.stack }));
  }

  const message = status >= 500
    ? "Internal server error"
    : err instanceof Error ? err.message : "Request failed";
  res.status(status).json({ error: message });
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
