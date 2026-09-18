import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";
import type { Prisma } from "@prisma/client";

// See tests/integration/modules/custom-orders/custom-order-flow.test.ts for
// why this stub is needed for `import "server-only"` use cases under Vitest.
vi.mock("server-only", () => ({}));

const { listAllPayoutRequests, changePayoutStatus } = await import("@modules/authors/application/manage-payouts");
const { listAuditLogs } = await import("@modules/audit");

function unique(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("author payout status transition (integration, ТЗ §28/§30)", () => {
  let adminId: string;
  let authorId: string;
  let payoutId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { email: `${unique("payout-admin")}@example.com`, passwordHash: "x", role: "ADMIN" },
    });
    adminId = admin.id;

    const author = await prisma.user.create({
      data: { email: `${unique("payout-author")}@example.com`, passwordHash: "x", role: "USER" },
    });
    authorId = author.id;

    const bankDetailsSnapshot: Prisma.InputJsonValue = {
      bankName: "Тестбанк",
      recipientName: "Иван Иванов",
      inn: "770000000000",
      accountNumber: "40817810000000000000",
    };

    const payout = await prisma.authorPayout.create({
      data: {
        userId: authorId,
        amount: 150_000,
        status: "REQUESTED",
        bankDetailsSnapshot,
      },
    });
    payoutId = payout.id;
  });

  afterAll(async () => {
    await prisma.authorPayout.delete({ where: { id: payoutId } });
    await prisma.user.delete({ where: { id: authorId } });
    await prisma.user.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it("lists the payout under its REQUESTED status", async () => {
    const requested = await listAllPayoutRequests({ status: "REQUESTED" });
    expect(requested.some((p) => p.id === payoutId)).toBe(true);
  });

  it("transitions REQUESTED → PROCESSING → PAID, stamping processedAt/processedByAdminId, and audit-logs each change", async () => {
    const processing = await changePayoutStatus({ payoutId, status: "PROCESSING", adminId });
    expect(processing.status).toBe("PROCESSING");

    const row1 = await prisma.authorPayout.findUniqueOrThrow({ where: { id: payoutId } });
    expect(row1.processedByAdminId).toBe(adminId);
    expect(row1.processedAt).not.toBeNull();

    const paid = await changePayoutStatus({ payoutId, status: "PAID", adminId, note: "Переведено вручную" });
    expect(paid.status).toBe("PAID");
    expect(paid.note).toBe("Переведено вручную");

    const audit = await listAuditLogs({
      event: "author.payout_status_changed",
      entityType: "AuthorPayout",
      entityId: payoutId,
    });
    expect(audit.items.length).toBeGreaterThanOrEqual(2);
    expect(audit.items.every((entry) => entry.actorRole === "ADMIN" && entry.actorUserId === adminId)).toBe(
      true,
    );

    const noLongerRequested = await listAllPayoutRequests({ status: "REQUESTED" });
    expect(noLongerRequested.some((p) => p.id === payoutId)).toBe(false);

    const paidList = await listAllPayoutRequests({ status: "PAID" });
    expect(paidList.some((p) => p.id === payoutId)).toBe(true);
  });

  it("rejects a status change for an unknown payout id", async () => {
    await expect(
      changePayoutStatus({ payoutId: "does-not-exist", status: "PAID", adminId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
