import { ConflictError, NotFoundError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import {
  findPublishedModelForCart,
  getOrCreateCartRow,
  insertCartItem,
  isModelOwnedByUser,
  isUniqueConstraintViolation,
} from "../infrastructure/prisma-cart-repository";

/**
 * Adds a model to the user's cart (ТЗ §22: one model = one cart position).
 * Throws `NotFoundError` if the model doesn't exist or isn't published, and
 * `ConflictError` if it's already in the cart OR already owned by the user
 * (a purchased model can't be re-added).
 */
export async function addItemToCart(userId: string, modelId: string): Promise<void> {
  const model = await findPublishedModelForCart(modelId);
  if (!model || model.status !== "PUBLISHED") {
    throw new NotFoundError("Модель не найдена");
  }

  if (await isModelOwnedByUser(userId, modelId)) {
    throw new ConflictError("Эта модель уже куплена — повторное добавление в корзину невозможно");
  }

  const cart = await getOrCreateCartRow(userId);

  try {
    await insertCartItem(cart.id, modelId);
  } catch (error) {
    // Covers both an existing row and the concurrent-double-add race (ТЗ
    // §66) — the DB unique constraint is the actual source of truth here.
    if (isUniqueConstraintViolation(error)) {
      throw new ConflictError("Эта модель уже в корзине");
    }
    throw error;
  }

  await recordAuditEvent({
    event: "cart.item_added",
    actorUserId: userId,
    entityType: "Model",
    entityId: modelId,
  });
}
