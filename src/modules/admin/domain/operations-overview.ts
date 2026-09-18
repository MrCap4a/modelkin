/** View types for the combined "Операционный центр" screen (design.pdf page 12, part 5). */

export interface AdminBuyerSummary {
  id: string;
  name: string | null;
  email: string;
  modelsPurchased: number;
  /** Kopecks. */
  totalSpent: number;
}

export interface AdminPaymentSummary {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  /** Kopecks. */
  amount: number;
  modelTitles: string[];
  createdAt: Date;
}

export interface OperationsOverview {
  buyers: AdminBuyerSummary[];
  payments: AdminPaymentSummary[];
}
