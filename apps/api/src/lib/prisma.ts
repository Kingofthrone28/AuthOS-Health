import { Prisma, PrismaClient } from "@prisma/client";

// Lazy singleton — defers `new PrismaClient()` until first access so that
// DATABASE_URL is read at call time, not at module import time. This matters in
// local dev where tsx may import modules before .env is loaded into process.env.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env["NODE_ENV"] === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

/**
 * Execute a callback with the PostgreSQL session variable `app.current_tenant`
 * set for RLS policy enforcement. Uses a transaction so SET LOCAL is scoped.
 */
export async function withTenant<T>(
  db: PrismaClient,
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    // set_config is parameterized and transaction-local, so a tenant context
    // cannot leak to another pooled connection or request.
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
    const environment = process.env["NODE_ENV"] === "test"
      ? "test"
      : process.env["NODE_ENV"] === "development" ? "development" : "production";
    await tx.$executeRaw`SELECT set_config('app.environment', ${environment}, true)`;
    return fn(tx);
  });
}
