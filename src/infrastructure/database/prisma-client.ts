import { PrismaClient } from "@prisma/client";
import { getConfig } from "@shared/config";

/**
 * Standard Next.js dev-mode singleton: without this, hot-reload would create
 * a new PrismaClient (and a new connection pool) on every file change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: getConfig().database.url } },
    log: getConfig().isProduction ? ["error", "warn"] : ["warn", "error"],
  });

if (!getConfig().isProduction) {
  globalForPrisma.prisma = prisma;
}
