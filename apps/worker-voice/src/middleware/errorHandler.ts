import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);
  const status = err instanceof ApiError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Internal server error";
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
