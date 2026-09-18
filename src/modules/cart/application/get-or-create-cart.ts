import type { Cart } from "@prisma/client";
import { getOrCreateCartRow } from "../infrastructure/prisma-cart-repository";

export async function getOrCreateCart(userId: string): Promise<Cart> {
  return getOrCreateCartRow(userId);
}
