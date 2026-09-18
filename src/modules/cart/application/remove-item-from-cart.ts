import { NotFoundError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import { deleteCartItem, findCartIdForUser } from "../infrastructure/prisma-cart-repository";

export async function removeItemFromCart(userId: string, modelId: string): Promise<void> {
  const cartId = await findCartIdForUser(userId);
  if (!cartId) {
    throw new NotFoundError("Корзина пуста");
  }

  const removed = await deleteCartItem(cartId, modelId);
  if (!removed) {
    throw new NotFoundError("Модель не найдена в корзине");
  }

  await recordAuditEvent({
    event: "cart.item_removed",
    actorUserId: userId,
    entityType: "Model",
    entityId: modelId,
  });
}
