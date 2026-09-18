import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@infrastructure/database";
import { addItemToCart } from "@modules/cart";
import { createOrder } from "@modules/orders";

// `/api/payments/mock/complete` requires an authenticated session, which
// reads `next/headers` cookies() — only available inside a real Next.js
// request scope. Fake just enough of it here, same pattern as
// tests/integration/modules/auth/*.test.ts.
const { cookieStore } = vi.hoisted(() => ({ cookieStore: new Map<string, string>() }));

vi.mock("server-only", () => ({}));

// `getCurrentUser` wraps itself in `React.cache` (RSC request-render
// de-duping) — a Next.js-canary-only React export that isn't available on
// the stable `react` package Vitest resolves outside of Next's own
// bundler. Stub it to identity so the auth barrel is importable here.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: <T>(fn: T): T => fn };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined),
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

const { POST } = await import("@/app/api/payments/mock/complete/route");
const { createSession } = await import("@modules/auth/infrastructure/prisma-session-repository");

/**
 * API-level test (ТЗ §49) for the dev/E2E mock-payment-completion route:
 * authorization (must be logged in; must own the payment) and validation,
 * on top of the happy path already covered indirectly by the E2E purchase
 * flow.
 */
describe("POST /api/payments/mock/complete (API contract)", () => {
  const suffix = randomUUID().slice(0, 8);
  let buyerId: string;
  let strangerId: string;
  let modelId: string;

  beforeAll(async () => {
    const buyer = await prisma.user.create({
      data: { email: `mock-complete-buyer-${suffix}@test.local`, passwordHash: "x" },
    });
    buyerId = buyer.id;

    const stranger = await prisma.user.create({
      data: { email: `mock-complete-stranger-${suffix}@test.local`, passwordHash: "x" },
    });
    strangerId = stranger.id;

    const model = await prisma.model.create({
      data: {
        title: "Mock complete API test model",
        slug: `mock-complete-api-${suffix}`,
        description: "desc",
        price: 5_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    modelId = model.id;
  });

  afterAll(async () => {
    await prisma.userModelOwnership.deleteMany({ where: { userId: buyerId } });
    await prisma.payment.deleteMany({ where: { order: { userId: buyerId } } });
    await prisma.order.deleteMany({ where: { userId: buyerId } });
    await prisma.session.deleteMany({ where: { userId: { in: [buyerId, strangerId] } } });
    await prisma.model.delete({ where: { id: modelId } });
    await prisma.user.deleteMany({ where: { id: { in: [buyerId, strangerId] } } });
    await prisma.$disconnect();
  });

  function jsonRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/payments/mock/complete", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  async function loginAs(userId: string): Promise<void> {
    cookieStore.clear();
    const { rawToken } = await createSession(userId);
    cookieStore.set("modelkin_session", rawToken);
  }

  it("returns 401 AUTHENTICATION_ERROR when no session cookie is present", async () => {
    cookieStore.clear();
    const response = await POST(jsonRequest({ providerPaymentId: "mock_whatever", status: "PAID" }), {
      params: Promise.resolve({}),
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("AUTHENTICATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR for a malformed body (bad status enum value)", async () => {
    await loginAs(buyerId);
    const response = await POST(jsonRequest({ providerPaymentId: "mock_whatever", status: "REFUNDED" }), {
      params: Promise.resolve({}),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 NOT_FOUND for a providerPaymentId that doesn't exist", async () => {
    await loginAs(buyerId);
    const response = await POST(
      jsonRequest({ providerPaymentId: `mock_${randomUUID()}`, status: "PAID" }),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 403 AUTHORIZATION_ERROR when the logged-in user doesn't own the payment", async () => {
    await addItemToCart(buyerId, modelId);
    const order = await createOrder(buyerId);

    await loginAs(strangerId);
    const response = await POST(
      jsonRequest({ providerPaymentId: order.providerPaymentId, status: "PAID" }),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("AUTHORIZATION_ERROR");

    // Cleanup so subsequent tests in this file can freely re-purchase.
    await prisma.orderItem.deleteMany({ where: { orderId: order.orderId } });
    await prisma.payment.deleteMany({ where: { orderId: order.orderId } });
    await prisma.order.delete({ where: { id: order.orderId } });
  });

  it("returns 200 and marks the order PAID when the owning buyer completes their own payment", async () => {
    await addItemToCart(buyerId, modelId);
    const order = await createOrder(buyerId);

    await loginAs(buyerId);
    const response = await POST(
      jsonRequest({ providerPaymentId: order.providerPaymentId, status: "PAID" }),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } });
    expect(dbOrder.status).toBe("PAID");

    const owned = await prisma.userModelOwnership.count({ where: { userId: buyerId, modelId } });
    expect(owned).toBe(1);
  });
});
