import "server-only";
import type { CustomOrderStatus, CustomOrderSummary } from "../domain/custom-order";
import { listCustomOrdersRepo } from "../infrastructure/prisma-custom-order-repository";

/** For the admin /admin/custom-orders list screen. Authorization is the caller's responsibility. */
export async function listCustomOrders(filter?: {
  status?: CustomOrderStatus;
}): Promise<CustomOrderSummary[]> {
  return listCustomOrdersRepo(filter);
}
