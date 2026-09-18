"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@modules/auth";
import { removeItemFromCart } from "@modules/cart";
import { createOrder } from "@modules/orders";
import { isAppError } from "@shared/errors";

/** Sends the user back to the cart with a human-readable error banner. */
function redirectWithError(error: unknown): never {
  const message = isAppError(error) ? error.message : "Не удалось выполнить действие";
  redirect(`/cart?error=${encodeURIComponent(message)}`);
}

export async function removeFromCartAction(modelId: string): Promise<void> {
  const user = await requireUser();

  try {
    await removeItemFromCart(user.id, modelId);
  } catch (error) {
    redirectWithError(error);
  }

  revalidatePath("/cart");
}

/** "Перейти к оплате" (ТЗ §23) — creates the order server-side, then sends
 * the buyer to the payment provider's redirect URL (the mock gateway page
 * until a real provider is wired in). */
export async function checkoutAction(): Promise<void> {
  const user = await requireUser();

  let redirectTarget: string;
  try {
    const result = await createOrder(user.id);
    redirectTarget = result.redirectUrl ?? "/profile";
  } catch (error) {
    redirectWithError(error);
  }

  redirect(redirectTarget);
}
