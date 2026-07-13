import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env["NODE_ENV"] === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const db = getPrismaClient();
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
    const environment = process.env["NODE_ENV"] === "test"
      ? "test"
      : process.env["NODE_ENV"] === "development" ? "development" : "production";
    await tx.$executeRaw`SELECT set_config('app.environment', ${environment}, true)`;
    return fn(tx);
  });
}
