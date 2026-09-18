import { prisma } from "@infrastructure/database";
import type { CreatePaymentResult } from "@infrastructure/payments";
import { computeOrderLines } from "../domain/compute-order-lines";
import type { CreateOrderResult, OrderHistoryItem } from "../domain/order-history-item";

interface CreatePaymentArgs {
  orderId: string;
  amount: number;
  description: string;
}

/**
 * Runs the full "Cart → Order → OrderItems → Payment → clear cart" flow (ТЗ
 * §23/§65) as a single Prisma transaction. Payment creation is injected as a
 * callback (rather than this file importing `@infrastructure/payments`
 * directly) so the transaction shape stays independent of the concrete
 * payment SDK — the application layer wires the two together.
 */
export async function createOrderInTransaction(params: {
  userId: string;
  providerName: string;
  createPayment: (args: CreatePaymentArgs) => Promise<CreatePaymentResult>;
}): Promise<CreateOrderResult> {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId: params.userId },
      include: { items: true },
    });

    // Never reuse cart-cached data: prices/status are re-read from `Model`
    // right now, inside the transaction, so a stale cart can't produce a
    // stale order (ТЗ §23). Empty-cart/unavailable-model rejection and the
    // total calculation itself live in the pure `computeOrderLines` domain
    // function so they're unit-testable without a DB.
    const modelIds = cart?.items.map((item) => item.modelId) ?? [];
    const models = await tx.model.findMany({ where: { id: { in: modelIds } } });
    const modelById = new Map(models.map((model) => [model.id, model]));

    const { lines, totalAmount } = computeOrderLines(cart?.items ?? [], modelById);
    // computeOrderLines throws for an empty items array, and an empty array
    // is exactly what `cart?.items ?? []` produces when `cart` is null — so
    // reaching this point guarantees `cart` is non-null.
    const cartId = cart!.id;

    const order = await tx.order.create({
      data: {
        userId: params.userId,
        status: "PENDING_PAYMENT",
        totalAmount,
        items: {
          create: lines.map((line) => ({
            modelId: line.modelId,
            titleSnapshot: line.title,
            priceSnapshot: line.price,
          })),
        },
      },
    });

    const paymentResult = await params.createPayment({
      orderId: order.id,
      amount: totalAmount,
      description: `Заказ ${order.id}`,
    });

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: params.providerName,
        providerPaymentId: paymentResult.providerPaymentId,
        status: paymentResult.status,
        amount: totalAmount,
      },
    });

    await tx.cartItem.deleteMany({ where: { cartId } });

    return {
      orderId: order.id,
      totalAmount,
      status: order.status,
      providerPaymentId: payment.providerPaymentId,
      redirectUrl: paymentResult.redirectUrl ?? null,
    };
  });
}

export async function listOrderHistoryForUser(userId: string): Promise<OrderHistoryItem[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { titleSnapshot: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1, select: { providerPaymentId: true } },
    },
  });

  return orders.map((order) => ({
    orderId: order.id,
    createdAt: order.createdAt,
    itemTitles: order.items.map((item) => item.titleSnapshot),
    totalAmount: order.totalAmount,
    status: order.status,
    providerPaymentId: order.payments[0]?.providerPaymentId ?? null,
  }));
}
