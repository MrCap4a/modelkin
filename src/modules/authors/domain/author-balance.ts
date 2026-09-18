export interface AuthorSaleRecord {
  orderItemId: string;
  modelId: string;
  modelTitle: string;
  buyerName: string | null;
  buyerEmail: string;
  priceAmount: number;
  authorEarningAmount: number;
  soldAt: Date;
}

export interface AuthorModelSummary {
  modelId: string;
  title: string;
  price: number;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  salesCount: number;
  grossRevenue: number;
  netEarnings: number;
}

export interface AuthorBalanceSummary {
  /** Lifetime sum of authorEarningAmount across every PAID order for this author. */
  totalNetEarnings: number;
  totalPaidOut: number;
  /** Sum of REQUESTED/PROCESSING payouts — already earmarked, not double-payable. */
  totalPendingPayout: number;
  availableForPayout: number;
}

export type PayoutStatus = "REQUESTED" | "PROCESSING" | "PAID" | "REJECTED";

export interface BankDetails {
  bankName: string;
  recipientName: string;
  inn: string;
  accountNumber: string;
}

export interface AuthorPayoutRecord {
  id: string;
  userId: string;
  amount: number;
  status: PayoutStatus;
  bankDetails: BankDetails;
  requestedAt: Date;
  processedAt: Date | null;
  note: string | null;
}
