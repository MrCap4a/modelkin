import { Prisma, type Cart } from "@prisma/client";
import { prisma } from "@infrastructure/database";
import { getPublicObjectUrl } from "@infrastructure/storage";
import type { CartItemView, CartSummary } from "../domain/cart-item-view";

/** Narrow helper: true when a Prisma write failed a unique constraint (P2002). */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** True when a Prisma write targeted a row that no longer exists (P2025). */
export function isRecordNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export async function findPublishedModelForCart(modelId: string) {
  return prisma.model.findUnique({ where: { id: modelId } });
}

export async function isModelOwnedByUser(userId: string, modelId: string): Promise<boolean> {
  const count = await prisma.userModelOwnership.count({ where: { userId, modelId } });
  return count > 0;
}

/**
 * Gets the user's cart, creating it on first use. Tolerates the race of two
 * concurrent "first add to cart" calls both trying to create the row (ТЗ
 * §66) — `Cart.userId` is `@unique`, so the loser's insert fails and it
 * simply re-reads the winner's row instead of erroring.
 */
export async function getOrCreateCartRow(userId: string): Promise<Cart> {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;

  try {
    return await prisma.cart.create({ data: { userId } });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (cart) return cart;
    }
    throw error;
  }
}

export async function findCartIdForUser(userId: string): Promise<string | null> {
  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  return cart?.id ?? null;
}

/**
 * Inserts a cart row. Relies on the `@@id([cartId, modelId])` constraint on
 * `CartItem` to make "one model = one cart position" airtight even under a
 * concurrent double-add (ТЗ §22/§66) — callers must translate the resulting
 * unique-violation into `ConflictError` themselves.
 */
export async function insertCartItem(cartId: string, modelId: string): Promise<void> {
  await prisma.cartItem.create({ data: { cartId, modelId } });
}

/** Returns false (rather than throwing) when the row was already gone. */
export async function deleteCartItem(cartId: string, modelId: string): Promise<boolean> {
  try {
    await prisma.cartItem.delete({ where: { cartId_modelId: { cartId, modelId } } });
    return true;
  } catch (error) {
    if (isRecordNotFoundError(error)) return false;
    throw error;
  }
}

export async function findCartWithItems(userId: string): Promise<CartSummary> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          model: {
            include: {
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
              tags: { orderBy: { tagId: "asc" }, take: 1, include: { tag: true } },
            },
          },
        },
      },
    },
  });

  if (!cart) return { items: [], totalAmount: 0 };

  const items: CartItemView[] = cart.items.map((item) => {
    const { model } = item;
    const firstImage = model.images[0];
    const firstTag = model.tags[0]?.tag;

    return {
      modelId: model.id,
      title: model.title,
      slug: model.slug,
      price: model.price,
      previewImageUrl: firstImage ? getPublicObjectUrl(firstImage.storageKey) : null,
      tagName: firstTag?.name ?? null,
    };
  });

  const totalAmount = items.reduce((sum, item) => sum + item.price, 0);
  return { items, totalAmount };
}

export async function countCartItems(userId: string): Promise<number> {
  const cartId = await findCartIdForUser(userId);
  if (!cartId) return 0;
  return prisma.cartItem.count({ where: { cartId } });
}

export async function isModelInCartForUser(userId: string, modelId: string): Promise<boolean> {
  const cartId = await findCartIdForUser(userId);
  if (!cartId) return false;
  const count = await prisma.cartItem.count({ where: { cartId, modelId } });
  return count > 0;
}
