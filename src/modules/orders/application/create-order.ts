import { getPaymentProvider } from "@infrastructure/payments";
import { recordAuditEvent } from "@modules/audit";
import type { CreateOrderResult } from "../domain/order-history-item";
import { createOrderInTransaction } from "../infrastructure/prisma-order-repository";

/**
 * Cart → Order → Payment (ТЗ §23). Validates the cart is non-empty, prices
 * and item availability are re-read from `Model` at this exact moment (never
 * from the cart), and the whole thing happens in one DB transaction (ТЗ
 * §65). Returns enough to redirect the buyer to the payment provider.
 */
export async function createOrder(userId: string): Promise<CreateOrderResult> {
  const provider = getPaymentProvider();

  const result = await createOrderInTransaction({
    userId,
    providerName: provider.providerName,
    createPayment: (args) => provider.createPayment(args),
  });

  await recordAuditEvent({
    event: "order.created",
    actorUserId: userId,
    entityType: "Order",
    entityId: result.orderId,
    metadata: { totalAmount: result.totalAmount },
  });

  return result;
}
