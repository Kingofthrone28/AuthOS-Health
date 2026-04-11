import { PrismaClient } from "@prisma/client";

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
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId.replace(/'/g, "''")}'`);
    return fn(tx as unknown as PrismaClient);
  });
}
