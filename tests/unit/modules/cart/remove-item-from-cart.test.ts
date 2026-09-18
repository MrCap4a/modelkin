import { describe, expect, it, vi, beforeEach } from "vitest";

const findCartIdForUser = vi.fn();
const deleteCartItem = vi.fn();

vi.mock("@modules/cart/infrastructure/prisma-cart-repository", () => ({
  findCartIdForUser: (...args: unknown[]) => findCartIdForUser(...args),
  deleteCartItem: (...args: unknown[]) => deleteCartItem(...args),
}));

const recordAuditEvent = vi.fn();
vi.mock("@modules/audit", () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEvent(...args),
}));

import { removeItemFromCart } from "@modules/cart/application/remove-item-from-cart";
import { NotFoundError } from "@shared/errors";

describe("removeItemFromCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when the user has no cart at all", async () => {
    findCartIdForUser.mockResolvedValue(null);

    await expect(removeItemFromCart("u1", "m1")).rejects.toThrow(NotFoundError);
    expect(deleteCartItem).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the model isn't in the cart", async () => {
    findCartIdForUser.mockResolvedValue("cart1");
    deleteCartItem.mockResolvedValue(false);

    await expect(removeItemFromCart("u1", "m1")).rejects.toThrow(NotFoundError);
  });

  it("removes the item and records a cart.item_removed audit event", async () => {
    findCartIdForUser.mockResolvedValue("cart1");
    deleteCartItem.mockResolvedValue(true);

    await removeItemFromCart("u1", "m1");

    expect(deleteCartItem).toHaveBeenCalledWith("cart1", "m1");
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "cart.item_removed", actorUserId: "u1", entityId: "m1" }),
    );
  });
});
