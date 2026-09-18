// Public contract of the admin module — read-side aggregation for screens
// that don't cleanly belong to one existing module (dashboard, combined
// "Операционный центр" users/payments view). Everything else the /admin/**
// screens need (models CRUD, custom orders, author payouts, audit log)
// comes directly from @modules/models, @modules/custom-orders,
// @modules/authors, @modules/audit — this module deliberately does not
// duplicate those contracts.

export { getDashboardStats } from "./application/get-dashboard-stats";
export { getUsersAndPaymentsOverview } from "./application/get-users-and-payments-overview";
export type { DashboardStats, DashboardMonthlyPoint, DashboardPopularModel } from "./domain/dashboard-stats";
export type { OperationsOverview, AdminBuyerSummary, AdminPaymentSummary } from "./domain/operations-overview";
