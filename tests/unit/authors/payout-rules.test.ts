import { describe, expect, it } from "vitest";
import {
  assertPayoutRequestAllowed,
  calculateAuthorEarning,
  MIN_PAYOUT_AMOUNT,
} from "@modules/authors/domain/payout-rules";

describe("calculateAuthorEarning", () => {
  it("applies the platform commission correctly", () => {
    // 350 ₽ at 20% commission → author keeps 80% = 280 ₽ = 28000 kopecks
    expect(calculateAuthorEarning(35_000, 2000)).toBe(28_000);
  });

  it("rounds to the nearest kopeck", () => {
    expect(calculateAuthorEarning(9_999, 3333)).toBe(6_666);
  });
});

describe("assertPayoutRequestAllowed", () => {
  const base = {
    requestedAmount: MIN_PAYOUT_AMOUNT,
    availableForPayout: MIN_PAYOUT_AMOUNT,
    lastRequestedAt: null,
  };

  it("allows a valid first-time request", () => {
    expect(() => assertPayoutRequestAllowed(base)).not.toThrow();
  });

  it("rejects amounts below the minimum payout", () => {
    expect(() =>
      assertPayoutRequestAllowed({ ...base, requestedAmount: MIN_PAYOUT_AMOUNT - 1 }),
    ).toThrow(/Минимальная сумма/);
  });

  it("rejects amounts above the available balance", () => {
    expect(() =>
      assertPayoutRequestAllowed({ ...base, availableForPayout: MIN_PAYOUT_AMOUNT - 1 }),
    ).toThrow(/превышает/);
  });

  it("rejects a second request inside the cooldown window", () => {
    const now = new Date("2026-01-08T00:00:00Z");
    const lastRequestedAt = new Date("2026-01-05T00:00:00Z"); // 3 days ago
    expect(() => assertPayoutRequestAllowed({ ...base, lastRequestedAt, now })).toThrow(
      /не чаще одного раза/,
    );
  });

  it("allows a request once the cooldown has passed", () => {
    const now = new Date("2026-01-13T00:00:01Z");
    const lastRequestedAt = new Date("2026-01-05T00:00:00Z"); // exactly 8 days ago
    expect(() => assertPayoutRequestAllowed({ ...base, lastRequestedAt, now })).not.toThrow();
  });
});
