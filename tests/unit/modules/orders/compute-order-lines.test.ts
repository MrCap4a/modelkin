import { describe, expect, it } from "vitest";
import { computeOrderLines } from "@modules/orders/domain/compute-order-lines";
import { ConflictError, ValidationError } from "@shared/errors";

describe("computeOrderLines", () => {
  it("sums current model prices into the order total — never a client-supplied value", () => {
    const modelsById = new Map([
      ["m1", { id: "m1", title: "Органайзер", price: 35_000, status: "PUBLISHED" }],
      ["m2", { id: "m2", title: "Лампа", price: 59_000, status: "PUBLISHED" }],
    ]);

    const { lines, totalAmount } = computeOrderLines(
      [{ modelId: "m1" }, { modelId: "m2" }],
      modelsById,
    );

    expect(totalAmount).toBe(94_000);
    expect(lines).toEqual([
      { modelId: "m1", title: "Органайзер", price: 35_000 },
      { modelId: "m2", title: "Лампа", price: 59_000 },
    ]);
  });

  it("rejects an empty cart", () => {
    expect(() => computeOrderLines([], new Map())).toThrow(ValidationError);
  });

  it("rejects a line whose model has since been unpublished/hidden", () => {
    const modelsById = new Map([
      ["m1", { id: "m1", title: "Органайзер", price: 35_000, status: "HIDDEN" }],
    ]);

    expect(() => computeOrderLines([{ modelId: "m1" }], modelsById)).toThrow(ConflictError);
  });

  it("rejects a line whose model no longer exists at all", () => {
    expect(() => computeOrderLines([{ modelId: "gone" }], new Map())).toThrow(ConflictError);
  });

  it("uses the model's CURRENT price, not any price that might have been cached elsewhere", () => {
    // Simulates a price change between "add to cart" and "checkout" — the
    // cart line only carries a modelId, so there's nothing stale to fall
    // back to; the current Model snapshot is the only source of truth.
    const modelsById = new Map([
      ["m1", { id: "m1", title: "Органайзер", price: 42_000, status: "PUBLISHED" }],
    ]);

    const { totalAmount } = computeOrderLines([{ modelId: "m1" }], modelsById);
    expect(totalAmount).toBe(42_000);
  });
});
