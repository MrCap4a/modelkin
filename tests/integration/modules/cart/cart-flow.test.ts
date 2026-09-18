import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@infrastructure/database";
import { addItemToCart, getCart, getCartItemCount, isModelInCart, removeItemFromCart } from "@modules/cart";
import { ConflictError, NotFoundError } from "@shared/errors";

describe("cart module — integration (ТЗ §22/§66)", () => {
  const suffix = randomUUID().slice(0, 8);
  let userId: string;
  let modelId: string;
  let tagId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `cart-flow-${suffix}@test.local`, passwordHash: "x" },
    });
    userId = user.id;

    const tag = await prisma.tag.create({
      data: { name: "Органайзеры", slug: `organizers-${suffix}` },
    });
    tagId = tag.id;

    const model = await prisma.model.create({
      data: {
        title: `Органайзер под отвёртки ${suffix}`,
        slug: `screwdriver-organizer-${suffix}`,
        description: "desc",
        price: 35_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
        images: { create: { storageKey: `previews/${suffix}.png`, sortOrder: 0 } },
        tags: { create: { tagId } },
      },
    });
    modelId = model.id;
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    await prisma.cart.deleteMany({ where: { userId } });
    await prisma.modelTag.deleteMany({ where: { modelId } });
    await prisma.modelImage.deleteMany({ where: { modelId } });
    await prisma.model.delete({ where: { id: modelId } });
    await prisma.tag.delete({ where: { id: tagId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("adds an item, exposes it via getCart with a server-computed total, then removes it", async () => {
    expect(await isModelInCart(userId, modelId)).toBe(false);
    expect(await getCartItemCount(userId)).toBe(0);

    await addItemToCart(userId, modelId);

    expect(await isModelInCart(userId, modelId)).toBe(true);
    expect(await getCartItemCount(userId)).toBe(1);

    const cart = await getCart(userId);
    expect(cart.totalAmount).toBe(35_000);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      modelId,
      price: 35_000,
      tagName: "Органайзеры",
    });
    expect(cart.items[0]?.previewImageUrl).toContain(`previews/${suffix}.png`);

    await removeItemFromCart(userId, modelId);

    expect(await getCartItemCount(userId)).toBe(0);
    expect((await getCart(userId)).items).toHaveLength(0);
  });

  it("rejects removing a model that isn't in the cart", async () => {
    await expect(removeItemFromCart(userId, modelId)).rejects.toThrow(NotFoundError);
  });

  it("rejects adding the same model twice, even under a true concurrent race (DB constraint, ТЗ §66)", async () => {
    const results = await Promise.allSettled([
      addItemToCart(userId, modelId),
      addItemToCart(userId, modelId),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);

    const count = await prisma.cartItem.count({ where: { cart: { userId }, modelId } });
    expect(count).toBe(1);

    await removeItemFromCart(userId, modelId);
  });
});
