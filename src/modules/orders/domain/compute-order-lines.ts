import { ConflictError, ValidationError } from "@shared/errors";

export interface CartLineInput {
  modelId: string;
}

export interface ModelSnapshotInput {
  id: string;
  title: string;
  price: number;
  status: string;
}

export interface OrderLine {
  modelId: string;
  title: string;
  price: number;
}

/**
 * Pure business rule (ТЗ §22/§23): every cart line's price/availability is
 * re-derived from the `Model` snapshot passed in — never trusted from a
 * cached cart or the client — and the order is rejected outright if the
 * cart is empty or if any line is no longer purchasable. No Prisma/DB
 * dependency, so this is the actual unit-testable core of order creation;
 * the infrastructure layer only supplies the current `Model` rows.
 */
export function computeOrderLines(
  cartItems: CartLineInput[],
  modelsById: Map<string, ModelSnapshotInput>,
): { lines: OrderLine[]; totalAmount: number } {
  if (cartItems.length === 0) {
    throw new ValidationError("Корзина пуста — добавьте модели перед оформлением заказа");
  }

  const lines: OrderLine[] = cartItems.map((item) => {
    const model = modelsById.get(item.modelId);
    if (!model || model.status !== "PUBLISHED") {
      throw new ConflictError(
        "Одна или несколько моделей в корзине больше недоступны для покупки",
        { modelId: item.modelId },
      );
    }
    return { modelId: model.id, title: model.title, price: model.price };
  });

  const totalAmount = lines.reduce((sum, line) => sum + line.price, 0);
  return { lines, totalAmount };
}
