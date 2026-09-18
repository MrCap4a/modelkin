/**
 * Outcome of one idempotent webhook-driven payment status transition (ТЗ
 * §25/§64). `changed=false` means the call was a no-op — either an exact
 * replay of the last known status, or an attempt to move an already-PAID
 * payment somewhere else — and the caller must not emit audit events for it.
 */
export interface PaymentTransitionResult {
  changed: boolean;
  paymentId: string;
  orderId: string;
  buyerUserId: string;
  orderTransitionedToPaid: boolean;
  /** modelIds that just got a fresh UserModelOwnership row this call. */
  newlyOwnedModelIds: string[];
}
