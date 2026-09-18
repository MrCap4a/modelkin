// Local, dependency-free status unions — deliberately not imported from
// Prisma or @infrastructure/payments so this stays true domain logic (ТЗ §8:
// "Domain не должен зависеть от ... Prisma ... конкретного платёжного
// провайдера"). Values are kept in sync with `PaymentStatus`/`OrderStatus`
// (prisma/schema.prisma) and `PaymentProviderStatus`
// (src/infrastructure/payments/payment-provider.ts) by convention.
export type ProviderPaymentStatus = "PENDING" | "PAID" | "FAILED";
export type StoredPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type StoredOrderStatus = "PENDING_PAYMENT" | "PAID" | "CANCELLED" | "REFUNDED";

export interface PaymentTransitionDecision {
  /** true = fully idempotent no-op; caller must not write anything. */
  isNoOp: boolean;
  /** Status to persist onto Payment. Only meaningful when !isNoOp. */
  nextPaymentStatus: ProviderPaymentStatus;
  /** Whether Order should be flipped from PENDING_PAYMENT to PAID. */
  shouldTransitionOrderToPaid: boolean;
  /** Whether ownership/author-earnings processing should run at all. */
  shouldProcessOwnership: boolean;
}

/**
 * Pure decision core of the webhook idempotency rule (ТЗ §25/§64): an exact
 * replay of the current payment status, or any attempt to move an
 * already-PAID payment elsewhere, is a no-op — nothing gets written. A
 * fresh transition to PAID additionally flips the order to PAID only if
 * it's still PENDING_PAYMENT (an order is paid exactly once) and triggers
 * ownership processing. No Prisma/IO — this is what the transaction wraps.
 */
export function decidePaymentTransition(params: {
  currentPaymentStatus: StoredPaymentStatus;
  currentOrderStatus: StoredOrderStatus;
  incomingStatus: ProviderPaymentStatus;
}): PaymentTransitionDecision {
  const { currentPaymentStatus, currentOrderStatus, incomingStatus } = params;

  if (currentPaymentStatus === incomingStatus || currentPaymentStatus === "PAID") {
    return {
      isNoOp: true,
      nextPaymentStatus: currentPaymentStatus === "PAID" ? "PAID" : incomingStatus,
      shouldTransitionOrderToPaid: false,
      shouldProcessOwnership: false,
    };
  }

  if (incomingStatus !== "PAID") {
    return {
      isNoOp: false,
      nextPaymentStatus: incomingStatus,
      shouldTransitionOrderToPaid: false,
      shouldProcessOwnership: false,
    };
  }

  return {
    isNoOp: false,
    nextPaymentStatus: "PAID",
    shouldTransitionOrderToPaid: currentOrderStatus === "PENDING_PAYMENT",
    shouldProcessOwnership: true,
  };
}
