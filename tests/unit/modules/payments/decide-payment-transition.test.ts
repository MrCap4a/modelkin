import { describe, expect, it } from "vitest";
import { decidePaymentTransition } from "@modules/payments/domain/decide-payment-transition";

describe("decidePaymentTransition", () => {
  it("transitions a PENDING payment to PAID and orders ownership processing", () => {
    const decision = decidePaymentTransition({
      currentPaymentStatus: "PENDING",
      currentOrderStatus: "PENDING_PAYMENT",
      incomingStatus: "PAID",
    });

    expect(decision).toEqual({
      isNoOp: false,
      nextPaymentStatus: "PAID",
      shouldTransitionOrderToPaid: true,
      shouldProcessOwnership: true,
    });
  });

  it("transitions a PENDING payment to FAILED without touching the order", () => {
    const decision = decidePaymentTransition({
      currentPaymentStatus: "PENDING",
      currentOrderStatus: "PENDING_PAYMENT",
      incomingStatus: "FAILED",
    });

    expect(decision).toEqual({
      isNoOp: false,
      nextPaymentStatus: "FAILED",
      shouldTransitionOrderToPaid: false,
      shouldProcessOwnership: false,
    });
  });

  it("is a no-op for an exact replay of the current status (idempotency, ТЗ §25/§64)", () => {
    const decision = decidePaymentTransition({
      currentPaymentStatus: "PAID",
      currentOrderStatus: "PAID",
      incomingStatus: "PAID",
    });

    expect(decision.isNoOp).toBe(true);
    expect(decision.shouldProcessOwnership).toBe(false);
    expect(decision.shouldTransitionOrderToPaid).toBe(false);
  });

  it("never downgrades an already-PAID payment, even if a stale FAILED webhook replays", () => {
    const decision = decidePaymentTransition({
      currentPaymentStatus: "PAID",
      currentOrderStatus: "PAID",
      incomingStatus: "FAILED",
    });

    expect(decision.isNoOp).toBe(true);
    expect(decision.nextPaymentStatus).toBe("PAID");
  });

  it("does not re-flip the order to PAID if it was already transitioned (e.g. a second PAID payment on the same order)", () => {
    const decision = decidePaymentTransition({
      currentPaymentStatus: "PENDING",
      currentOrderStatus: "PAID",
      incomingStatus: "PAID",
    });

    expect(decision.isNoOp).toBe(false);
    expect(decision.shouldTransitionOrderToPaid).toBe(false);
    // Ownership creation still runs — it's independently idempotent via the
    // UserModelOwnership unique constraint — but the order write is skipped.
    expect(decision.shouldProcessOwnership).toBe(true);
  });
});
