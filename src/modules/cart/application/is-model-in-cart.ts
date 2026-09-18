import { isModelInCartForUser } from "../infrastructure/prisma-cart-repository";

/** Used by the model-detail page to show an "already in cart" state. */
export async function isModelInCart(userId: string, modelId: string): Promise<boolean> {
  return isModelInCartForUser(userId, modelId);
}
