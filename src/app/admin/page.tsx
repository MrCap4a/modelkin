import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardStats } from "@modules/admin";
import { formatPriceRub } from "@modules/models";
import { PageHeader } from "./_components/page-header";
import { StatCard } from "./_components/stat-card";
import { SalesChart } from "./_components/sales-chart";
import { ClockIcon, ModelsIcon, PaymentsIcon, UsersIcon } from "./_components/admin-icons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader title="Обзор панели" subtitle="Добро пожаловать в админ-панель Моделкин" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Продано моделей"
          value={`${stats.modelsSoldCount.toLocaleString("ru-RU")} STL`}
          growthPct={stats.modelsSoldGrowthPct}
          icon={<ModelsIcon />}
        />
        <StatCard
          label="Новые пользователи"
          value={stats.newUsersCount.toLocaleString("ru-RU")}
          growthPct={stats.newUsersGrowthPct}
          icon={<UsersIcon />}
        />
        <StatCard
          label="Выручка"
          value={formatPriceRub(stats.revenueLast30Days)}
          growthPct={stats.revenueGrowthPct}
          icon={<PaymentsIcon />}
        />
        <StatCard
          label="Активные заказы"
          value={`${stats.activeCustomOrdersCount} заявок`}
          growthPct={null}
          icon={<ClockIcon />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-base font-bold text-ink">Динамика продаж (тыс. руб)</h2>
          <div className="mt-6">
            <SalesChart
              points={stats.monthlySales.map((point) => ({
                ...point,
                totalAmount: Math.round(point.totalAmount / 1000),
              }))}
            />
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-base font-bold text-ink">Популярно у печатников</h2>
          <ul className="mt-4 space-y-4">
            {stats.popularModels.length === 0 && (
              <li className="text-sm text-ink-muted">Пока нет данных о продажах</li>
            )}
            {stats.popularModels.map((model) => (
              <li key={model.id} className="flex items-center gap-3">
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-control bg-surface-alt">
                  {model.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public S3 URL, not a local/optimizable asset
                    <img src={model.previewImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/models/${model.id}`}
                    className="block truncate text-sm font-medium text-ink hover:text-primary"
                  >
                    {model.title}
                  </Link>
                  <p className="text-xs text-ink-muted">{model.salesCount} скачивания</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink">{formatPriceRub(model.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
