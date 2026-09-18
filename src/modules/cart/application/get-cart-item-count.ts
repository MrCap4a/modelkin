import { countCartItems } from "../infrastructure/prisma-cart-repository";

/** Used by the shared header cart badge. */
export async function getCartItemCount(userId: string): Promise<number> {
  return countCartItems(userId);
}
