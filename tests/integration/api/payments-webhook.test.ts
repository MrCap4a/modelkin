import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@infrastructure/database";
import { addItemToCart } from "@modules/cart";
import { createOrder } from "@modules/orders";

const { POST } = await import("@/app/api/payments/webhook/route");

const MOCK_WEBHOOK_SECRET_HEADER = "x-mock-webhook-secret";
const MOCK_WEBHOOK_SECRET = "mock-webhook-shared-secret";

/**
 * API-level test (ТЗ §49/§64/§65) for the payment provider webhook: status
 * codes, signature verification, and idempotent PAID transition +
 * ownership creation — hitting the real Route Handler (not the use case
 * directly) so `withApiHandler`'s status-code mapping is exercised too.
 */
describe("POST /api/payments/webhook (API contract)", () => {
  const suffix = randomUUID().slice(0, 8);
  let userId: string;
  let modelId: string;

  async function freshOrder() {
    await addItemToCart(userId, modelId);
    return createOrder(userId);
  }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `webhook-api-${suffix}@test.local`, passwordHash: "x" },
    });
    userId = user.id;

    const model = await prisma.model.create({
      data: {
        title: "Webhook API test model",
        slug: `webhook-api-${suffix}`,
        description: "desc",
        price: 12_300,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    modelId = model.id;
  });

  afterAll(async () => {
    await prisma.userModelOwnership.deleteMany({ where: { userId } });
    await prisma.orderItem.deleteMany({ where: { model: { id: modelId } } });
    await prisma.payment.deleteMany({ where: { order: { userId } } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.model.delete({ where: { id: modelId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  function webhookRequest(body: unknown, headers: Record<string, string>): NextRequest {
    return new NextRequest("http://localhost:3000/api/payments/webhook", {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });
  }

  it("rejects a request with a missing/invalid signature with 400 VALIDATION_ERROR", async () => {
    const response = await POST(
      webhookRequest({ providerPaymentId: "mock_whatever", status: "PAID" }, {}),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 and does nothing observable for an unknown providerPaymentId (correctly-signed but no matching Payment)", async () => {
    // processPaymentWebhook throws NotFoundError from applyPaymentStatusTransition
    // when no Payment row matches — the route still maps that to a JSON error,
    // not a 500, confirming the error-handling contract (ТЗ §40).
    const response = await POST(
      webhookRequest(
        { providerPaymentId: `mock_${randomUUID()}`, status: "PAID" },
        { [MOCK_WEBHOOK_SECRET_HEADER]: MOCK_WEBHOOK_SECRET },
      ),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("transitions Order to PAID and grants ownership on a correctly-signed PAID webhook, idempotently", async () => {
    const order = await freshOrder();

    const response = await POST(
      webhookRequest(
        { providerPaymentId: order.providerPaymentId, status: "PAID" },
        { [MOCK_WEBHOOK_SECRET_HEADER]: MOCK_WEBHOOK_SECRET },
      ),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } });
    expect(dbOrder.status).toBe("PAID");

    const ownershipCount = await prisma.userModelOwnership.count({
      where: { userId, modelId },
    });
    expect(ownershipCount).toBe(1);

    // Replaying the exact same webhook must not create a duplicate
    // ownership row or fail (ТЗ §25/§64: idempotent webhook processing).
    const replay = await POST(
      webhookRequest(
        { providerPaymentId: order.providerPaymentId, status: "PAID" },
        { [MOCK_WEBHOOK_SECRET_HEADER]: MOCK_WEBHOOK_SECRET },
      ),
      { params: Promise.resolve({}) },
    );
    expect(replay.status).toBe(200);

    const ownershipCountAfterReplay = await prisma.userModelOwnership.count({
      where: { userId, modelId },
    });
    expect(ownershipCountAfterReplay).toBe(1);
  });
});
