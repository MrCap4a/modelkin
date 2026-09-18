"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@modules/auth";
import { addItemToCart } from "@modules/cart";
import { isAppError } from "@shared/errors";

export type AddToCartResult = { ok: true } | { ok: false; message: string };

/**
 * Called from the client `AddToCartButton` on the model detail page. Guests
 * never reach this action — the CTA renders a plain `/login` link instead of
 * this button when there's no session (see `purchase-cta.tsx`) — but the
 * check is repeated here too since this is a server entry point that must
 * not trust the client.
 */
export async function addToCartAction(modelId: string, slug: string): Promise<AddToCartResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Войдите, чтобы добавить модель в корзину" };
  }

  try {
    await addItemToCart(user.id, modelId);
  } catch (error) {
    if (isAppError(error)) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  revalidatePath(`/models/${slug}`);
  return { ok: true };
}
