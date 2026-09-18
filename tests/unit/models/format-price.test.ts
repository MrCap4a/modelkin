import { describe, expect, it } from "vitest";
// Imports from the concrete file rather than the module barrel
// (@modules/models) — the barrel now also re-exports the admin write-side
// use cases (create-model.ts et al.), which start with `import "server-only"`.
// Evaluating that barrel outside Next's "react-server" resolve condition
// (i.e. under plain Vitest, with no `vi.mock("server-only", ...)` stub)
// throws — same reason tests/unit/modules/custom-orders/custom-order-schema.test.ts
// imports from @modules/custom-orders/domain/custom-order-schema instead of
// the @modules/custom-orders barrel.
import { formatPriceRub } from "@modules/models/domain/format-price";

describe("formatPriceRub", () => {
  it("formats a whole-ruble amount without decimals", () => {
    expect(formatPriceRub(35000)).toBe("350 ₽");
  });

  it("formats a fractional-ruble amount with two decimals", () => {
    expect(formatPriceRub(19999)).toBe("199,99 ₽");
  });

  it("formats zero", () => {
    expect(formatPriceRub(0)).toBe("0 ₽");
  });

  it("groups thousands using Russian locale formatting (non-breaking space separator)", () => {
    expect(formatPriceRub(150000000)).toBe("1 500 000 ₽");
  });
});
