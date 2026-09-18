import type { OrderHistoryItem } from "../domain/order-history-item";
import { listOrderHistoryForUser } from "../infrastructure/prisma-order-repository";

/** For the profile "История платежей" tab. */
export async function listUserOrderHistory(userId: string): Promise<OrderHistoryItem[]> {
  return listOrderHistoryForUser(userId);
}
