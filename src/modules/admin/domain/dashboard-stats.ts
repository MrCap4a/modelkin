/** View types for the /admin dashboard screen (design.pdf "Обзор панели"). */

export interface DashboardMonthlyPoint {
  /** Short Russian month label, e.g. "янв". */
  label: string;
  /** Sum of PAID orders' totalAmount for that calendar month, in kopecks. */
  totalAmount: number;
}

export interface DashboardPopularModel {
  id: string;
  slug: string;
  title: string;
  price: number;
  salesCount: number;
  previewImageUrl: string | null;
}

export interface DashboardStats {
  /** Lifetime count of PAID OrderItems ("STL units sold"). */
  modelsSoldCount: number;
  /** % change of last-30-day sales vs the preceding 30-day window; null when the preceding window had zero sales. */
  modelsSoldGrowthPct: number | null;

  /** New users registered in the last 30 days. */
  newUsersCount: number;
  newUsersGrowthPct: number | null;

  /** Sum of PAID orders' totalAmount in the last 30 days, in kopecks. */
  revenueLast30Days: number;
  revenueGrowthPct: number | null;

  /** Custom orders in NEW or IN_PROGRESS status — need admin attention. */
  activeCustomOrdersCount: number;

  /** Last 12 calendar months, oldest first. */
  monthlySales: DashboardMonthlyPoint[];

  /** Top-selling published models, by ownership count. */
  popularModels: DashboardPopularModel[];
}
