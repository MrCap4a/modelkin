// Public contract of the authors module. See ARCHITECTURE.md → "Расширение:
// модуль authors" for why this module exists beyond the base ТЗ §9 list.

export { isAuthor, getAuthorDashboard, getModelSalesHistory } from "./application/author-dashboard";
export { requestPayout, type RequestPayoutInput } from "./application/request-payout";
export {
  listAllPayoutRequests,
  changePayoutStatus,
} from "./application/manage-payouts";
export { MIN_PAYOUT_AMOUNT, PAYOUT_COOLDOWN_DAYS } from "./domain/payout-rules";
export type {
  AuthorBalanceSummary,
  AuthorModelSummary,
  AuthorSaleRecord,
  AuthorPayoutRecord,
  BankDetails,
  PayoutStatus,
} from "./domain/author-balance";
export type { AuthorDashboard } from "./application/author-dashboard";
