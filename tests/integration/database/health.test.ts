import { describe, expect, it, afterAll } from "vitest";
import { prisma, checkDatabaseHealth } from "@infrastructure/database";

describe("database connectivity", () => {
  it("connects to the configured PostgreSQL instance", async () => {
    expect(await checkDatabaseHealth()).toBe(true);
  });

  it("can read seeded catalog tags", async () => {
    const tagCount = await prisma.tag.count();
    expect(tagCount).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
