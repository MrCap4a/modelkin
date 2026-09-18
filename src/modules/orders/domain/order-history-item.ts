import type { OrderStatus } from "@prisma/client";

/**
 * Contract consumed by the profile "История платежей" tab.
 */
export interface OrderHistoryItem {
  orderId: string;
  createdAt: Date;
  itemTitles: string[];
  totalAmount: number;
  status: OrderStatus;
  providerPaymentId: string | null;
}

/**
 * What `createOrder` hands back to the checkout entry point — enough to
 * redirect the buyer to the payment provider (ТЗ §23/§25).
 */
export interface CreateOrderResult {
  orderId: string;
  totalAmount: number;
  status: OrderStatus;
  providerPaymentId: string;
  redirectUrl: string | null;
}
