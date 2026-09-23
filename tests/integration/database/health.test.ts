import { describe, expect, it, afterAll } from "vitest";
import { prisma, checkDatabaseHealth } from "@infrastructure/database";

function unique(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("database connectivity", () => {
  const createdTagIds: string[] = [];

  it("connects to the configured PostgreSQL instance", async () => {
    expect(await checkDatabaseHealth()).toBe(true);
  });

  // Was asserting `prisma.tag.count() > 0`, which silently depended on
  // `npm run db:seed` having been run against this database beforehand —
  // true in local dev (documented in README's quick start) but not in CI,
  // where the build-and-test job only runs migrations. Every other
  // integration test in this repo creates its own fixture and cleans up
  // rather than relying on unscoped global/seeded state (see e.g.
  // tests/integration/modules/tags/tags-flow.test.ts) — this test now does
  // the same, so it verifies the same thing (Prisma can read real rows
  // back from the Tag table) without depending on what else has or hasn't
  // been seeded.
  it("can read a row back from the database", async () => {
    const tag = await prisma.tag.create({
      data: { name: unique("Проверка БД"), slug: unique("db-health-check") },
    });
    createdTagIds.push(tag.id);

    const tagCount = await prisma.tag.count();
    expect(tagCount).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await prisma.tag.deleteMany({ where: { id: { in: createdTagIds } } });
    await prisma.$disconnect();
  });
});
