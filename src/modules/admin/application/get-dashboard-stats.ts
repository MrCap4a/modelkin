import "server-only";
import { prisma } from "@infrastructure/database";
import { getPublicObjectUrl } from "@infrastructure/storage";
import type { DashboardMonthlyPoint, DashboardPopularModel, DashboardStats } from "../domain/dashboard-stats";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_BACK = 12;
const POPULAR_MODELS_LIMIT = 3;

/** Percentage change of `current` vs `previous`, rounded to one decimal. `null` when there's no meaningful baseline. */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function buildMonthlySales(now: Date): Promise<DashboardMonthlyPoint[]> {
  const points: DashboardMonthlyPoint[] = [];

  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    // 12 small aggregates; simplicity over a single groupBy (this isn't hot-path code, see task brief).
    const agg = await prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: start, lt: end } },
      _sum: { totalAmount: true },
    });

    points.push({
      label: start.toLocaleDateString("ru-RU", { month: "short" }),
      totalAmount: agg._sum.totalAmount ?? 0,
    });
  }

  return points;
}

async function buildPopularModels(): Promise<DashboardPopularModel[]> {
  const rows = await prisma.model.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ ownerships: { _count: "desc" } }, { publishedAt: "desc" }],
    take: POPULAR_MODELS_LIMIT,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { ownerships: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    salesCount: row._count.ownerships,
    previewImageUrl: row.images[0] ? getPublicObjectUrl(row.images[0].storageKey) : null,
  }));
}

/**
 * For the /admin dashboard (design.pdf "Обзор панели"). Headline numbers
 * mirror what the task brief specifies (total models sold lifetime, new
 * users/revenue in the last 30 days, active custom orders as a live
 * snapshot); growth badges compare the trailing 30-day window against the
 * one before it, matching the PDF's "+X% за последние 30 дней" copy.
 * Authorization (ADMIN-only) is the caller's responsibility.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const last30Start = new Date(now.getTime() - 30 * DAY_MS);
  const prev30Start = new Date(now.getTime() - 60 * DAY_MS);

  const [
    modelsSoldTotal,
    modelsSoldLast30,
    modelsSoldPrev30,
    newUsersLast30,
    newUsersPrev30,
    revenueLast30Agg,
    revenuePrev30Agg,
    activeCustomOrdersCount,
    monthlySales,
    popularModels,
  ] = await Promise.all([
    prisma.orderItem.count({ where: { order: { status: "PAID" } } }),
    prisma.orderItem.count({ where: { order: { status: "PAID", createdAt: { gte: last30Start } } } }),
    prisma.orderItem.count({
      where: { order: { status: "PAID", createdAt: { gte: prev30Start, lt: last30Start } } },
    }),
    prisma.user.count({ where: { createdAt: { gte: last30Start } } }),
    prisma.user.count({ where: { createdAt: { gte: prev30Start, lt: last30Start } } }),
    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: last30Start } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: prev30Start, lt: last30Start } },
      _sum: { totalAmount: true },
    }),
    prisma.customOrder.count({ where: { status: { in: ["NEW", "IN_PROGRESS"] } } }),
    buildMonthlySales(now),
    buildPopularModels(),
  ]);

  const revenueLast30Days = revenueLast30Agg._sum.totalAmount ?? 0;
  const revenuePrev30Days = revenuePrev30Agg._sum.totalAmount ?? 0;

  return {
    modelsSoldCount: modelsSoldTotal,
    modelsSoldGrowthPct: pctChange(modelsSoldLast30, modelsSoldPrev30),
    newUsersCount: newUsersLast30,
    newUsersGrowthPct: pctChange(newUsersLast30, newUsersPrev30),
    revenueLast30Days,
    revenueGrowthPct: pctChange(revenueLast30Days, revenuePrev30Days),
    activeCustomOrdersCount,
    monthlySales,
    popularModels,
  };
}
