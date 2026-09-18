import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";

// `server-only` throws when required outside Next's "react-server" resolve
// condition, which Vitest doesn't provide. Stub it to a no-op so use cases
// marked `import "server-only"` are importable under test — same pattern as
// tests/integration/modules/auth/register-user.test.ts.
vi.mock("server-only", () => ({}));

// submitCustomOrder calls @modules/auth's getCurrentUser(), which is wrapped
// in React's `cache()` — only available in the canary React build Next.js
// bundles internally, not the plain `react` package Vitest resolves (see the
// same note in tests/integration/modules/auth/password-reset-flow.test.ts).
// Replace it with an equivalent lookup against a fake cookie store, driven
// by the real session repository (no next/headers / React involved).
const { cookieStore } = vi.hoisted(() => ({ cookieStore: new Map<string, string>() }));

vi.mock("@modules/auth", async () => {
  const { findSessionUserByRawToken } = await import(
    "@modules/auth/infrastructure/prisma-session-repository"
  );
  return {
    getCurrentUser: async () => {
      const token = cookieStore.get("modelkin_session");
      if (!token) return null;
      return findSessionUserByRawToken(token);
    },
  };
});

const { submitCustomOrder } = await import("@modules/custom-orders/application/submit-custom-order");
const { updateCustomOrderStatus } = await import(
  "@modules/custom-orders/application/update-custom-order-status"
);
const { listCustomOrders } = await import("@modules/custom-orders/application/list-custom-orders");
const { getCustomOrderDetail } = await import(
  "@modules/custom-orders/application/get-custom-order-detail"
);
const { createSession } = await import("@modules/auth/infrastructure/prisma-session-repository");
const { listAuditLogs } = await import("@modules/audit");

function unique(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("custom orders (integration)", () => {
  let loggedInUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `${unique("custom-order-user")}@example.com`, passwordHash: "x", role: "USER" },
    });
    loggedInUserId = user.id;

    const admin = await prisma.user.create({
      data: { email: `${unique("custom-order-admin")}@example.com`, passwordHash: "x", role: "ADMIN" },
    });
    adminUserId = admin.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("submits as a guest: userId stays null, status starts NEW", async () => {
    cookieStore.clear();

    const { id } = await submitCustomOrder({
      description: "Нужен держатель для наушников",
      name: unique("Гость"),
      contactType: "TELEGRAM",
      contactValue: "@guest_customer",
      files: [],
    });

    const row = await prisma.customOrder.findUnique({ where: { id } });
    expect(row).not.toBeNull();
    expect(row?.userId).toBeNull();
    expect(row?.status).toBe("NEW");
  });

  it("submits as a logged-in user: userId is attached from the session", async () => {
    const { rawToken } = await createSession(loggedInUserId);
    cookieStore.set("modelkin_session", rawToken);

    const { id } = await submitCustomOrder({
      description: "Нужен органайзер для инструментов",
      name: unique("Пользователь"),
      contactType: "PHONE",
      contactValue: "+7 999 123-45-67",
      files: [],
    });

    const row = await prisma.customOrder.findUnique({ where: { id } });
    expect(row?.userId).toBe(loggedInUserId);

    cookieStore.clear();
  });

  it("creates CustomOrderFile rows for attachments and audit-logs file.upload per file", async () => {
    cookieStore.clear();

    const { id } = await submitCustomOrder({
      description: "Нужна деталь по чертежу",
      name: unique("СФайлом"),
      contactType: "MAX",
      contactValue: "max-handle",
      files: [
        {
          storageKey: `custom-orders/${unique("key")}.jpg`,
          originalName: "sketch.jpg",
          mimeType: "image/jpeg",
          size: 12_345,
        },
      ],
    });

    const files = await prisma.customOrderFile.findMany({ where: { customOrderId: id } });
    expect(files).toHaveLength(1);
    expect(files[0]?.originalName).toBe("sketch.jpg");

    const audit = await listAuditLogs({
      event: "file.upload",
      entityType: "CustomOrderFile",
      entityId: files[0]!.id,
    });
    expect(audit.items.length).toBeGreaterThanOrEqual(1);
  });

  it("transitions status and audit-logs custom_order.status_changed", async () => {
    cookieStore.clear();

    const { id } = await submitCustomOrder({
      description: "Заявка для смены статуса",
      name: unique("СтатусТест"),
      contactType: "TELEGRAM",
      contactValue: "@status_test",
      files: [],
    });

    const updated = await updateCustomOrderStatus(id, "IN_PROGRESS", adminUserId);
    expect(updated.status).toBe("IN_PROGRESS");

    const detail = await getCustomOrderDetail(id);
    expect(detail?.status).toBe("IN_PROGRESS");

    const audit = await listAuditLogs({
      event: "custom_order.status_changed",
      entityType: "CustomOrder",
      entityId: id,
    });
    expect(audit.items.length).toBeGreaterThanOrEqual(1);
    expect(audit.items[0]?.actorRole).toBe("ADMIN");
    expect(audit.items[0]?.actorUserId).toBe(adminUserId);
  });

  it("rejects a status update for an unknown order id", async () => {
    await expect(
      updateCustomOrderStatus("does-not-exist", "COMPLETED", adminUserId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lists and filters by status", async () => {
    cookieStore.clear();

    const newOrder = await submitCustomOrder({
      description: "Список: должен остаться NEW",
      name: unique("СписокNEW"),
      contactType: "TELEGRAM",
      contactValue: "@list_new",
      files: [],
    });

    const completedOrder = await submitCustomOrder({
      description: "Список: станет COMPLETED",
      name: unique("СписокCOMPLETED"),
      contactType: "TELEGRAM",
      contactValue: "@list_completed",
      files: [],
    });
    await updateCustomOrderStatus(completedOrder.id, "COMPLETED", adminUserId);

    const newOnly = await listCustomOrders({ status: "NEW" });
    expect(newOnly.some((o) => o.id === newOrder.id)).toBe(true);
    expect(newOnly.some((o) => o.id === completedOrder.id)).toBe(false);

    const completedOnly = await listCustomOrders({ status: "COMPLETED" });
    expect(completedOnly.some((o) => o.id === completedOrder.id)).toBe(true);
    expect(completedOnly.some((o) => o.id === newOrder.id)).toBe(false);

    const all = await listCustomOrders();
    expect(all.some((o) => o.id === newOrder.id)).toBe(true);
    expect(all.some((o) => o.id === completedOrder.id)).toBe(true);
  });
});
