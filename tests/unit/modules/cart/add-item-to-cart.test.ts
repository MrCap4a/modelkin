import { describe, expect, it, vi, beforeEach } from "vitest";

// Cart's application layer imports Prisma-backed infrastructure directly,
// so business-rule unit tests mock that seam (and @modules/audit, which
// itself touches the DB) rather than hitting a real database — keeping
// this a true unit test per TESTING.md ("unit tests never touch DB/network").
const findPublishedModelForCart = vi.fn();
const getOrCreateCartRow = vi.fn();
const insertCartItem = vi.fn();
const isModelOwnedByUser = vi.fn();
const isUniqueConstraintViolation = vi.fn();

vi.mock("@modules/cart/infrastructure/prisma-cart-repository", () => ({
  findPublishedModelForCart: (...args: unknown[]) => findPublishedModelForCart(...args),
  getOrCreateCartRow: (...args: unknown[]) => getOrCreateCartRow(...args),
  insertCartItem: (...args: unknown[]) => insertCartItem(...args),
  isModelOwnedByUser: (...args: unknown[]) => isModelOwnedByUser(...args),
  isUniqueConstraintViolation: (...args: unknown[]) => isUniqueConstraintViolation(...args),
}));

const recordAuditEvent = vi.fn();
vi.mock("@modules/audit", () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEvent(...args),
}));

import { addItemToCart } from "@modules/cart/application/add-item-to-cart";
import { ConflictError, NotFoundError } from "@shared/errors";

describe("addItemToCart — cart business rules (ТЗ §22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when the model doesn't exist", async () => {
    findPublishedModelForCart.mockResolvedValue(null);

    await expect(addItemToCart("u1", "m1")).rejects.toThrow(NotFoundError);
    expect(getOrCreateCartRow).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the model isn't published", async () => {
    findPublishedModelForCart.mockResolvedValue({ id: "m1", status: "DRAFT" });

    await expect(addItemToCart("u1", "m1")).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when the user already owns the model — a purchased model can't be re-added", async () => {
    findPublishedModelForCart.mockResolvedValue({ id: "m1", status: "PUBLISHED" });
    isModelOwnedByUser.mockResolvedValue(true);

    await expect(addItemToCart("u1", "m1")).rejects.toThrow(ConflictError);
    expect(getOrCreateCartRow).not.toHaveBeenCalled();
  });

  it("throws ConflictError when the model is already in the cart (one model = one item)", async () => {
    findPublishedModelForCart.mockResolvedValue({ id: "m1", status: "PUBLISHED" });
    isModelOwnedByUser.mockResolvedValue(false);
    getOrCreateCartRow.mockResolvedValue({ id: "cart1" });
    insertCartItem.mockRejectedValue(new Error("unique violation"));
    isUniqueConstraintViolation.mockReturnValue(true);

    await expect(addItemToCart("u1", "m1")).rejects.toThrow(ConflictError);
  });

  it("propagates an unexpected insert failure instead of masking it as a conflict", async () => {
    findPublishedModelForCart.mockResolvedValue({ id: "m1", status: "PUBLISHED" });
    isModelOwnedByUser.mockResolvedValue(false);
    getOrCreateCartRow.mockResolvedValue({ id: "cart1" });
    const dbDown = new Error("connection reset");
    insertCartItem.mockRejectedValue(dbDown);
    isUniqueConstraintViolation.mockReturnValue(false);

    await expect(addItemToCart("u1", "m1")).rejects.toBe(dbDown);
  });

  it("adds the item and records a cart.item_added audit event on success", async () => {
    findPublishedModelForCart.mockResolvedValue({ id: "m1", status: "PUBLISHED" });
    isModelOwnedByUser.mockResolvedValue(false);
    getOrCreateCartRow.mockResolvedValue({ id: "cart1" });
    insertCartItem.mockResolvedValue(undefined);

    await addItemToCart("u1", "m1");

    expect(insertCartItem).toHaveBeenCalledWith("cart1", "m1");
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "cart.item_added", actorUserId: "u1", entityId: "m1" }),
    );
  });
});
