export { prisma } from "./prisma-client";

export async function checkDatabaseHealth(): Promise<boolean> {
  const { prisma } = await import("./prisma-client");
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
