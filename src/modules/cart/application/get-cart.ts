import type { CartSummary } from "../domain/cart-item-view";
import { findCartWithItems } from "../infrastructure/prisma-cart-repository";

/**
 * Server-computed cart view. `totalAmount` is always derived from current
 * `Model.price` at read time — the client never supplies or overrides it
 * (ТЗ §22: "Никогда не доверять total, который прислал frontend").
 */
export async function getCart(userId: string): Promise<CartSummary> {
  return findCartWithItems(userId);
}
