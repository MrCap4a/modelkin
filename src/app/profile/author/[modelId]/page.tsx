import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@modules/auth";
import { getAuthorDashboard, getModelSalesHistory, isAuthor, MIN_PAYOUT_AMOUNT } from "@modules/authors";
import { formatPriceRub } from "@modules/models";
import { getConfig } from "@shared/config";
import { ProfileShell } from "../../_components/profile-shell";
import { PayoutRequestButton } from "../_components/payout-request-button";

export const metadata: Metadata = { title: "Детализация модели" };

function formatDate(date: Date): string {
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AuthorModelDetailPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = await params;

  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  if (!(await isAuthor(sessionUser.id))) {
    redirect("/profile");
  }

  const dashboard = await getAuthorDashboard(sessionUser.id);
  const model = dashboard.models.find((m) => m.modelId === modelId);

  if (!model) {
    redirect("/profile/author");
  }

  const sales = await getModelSalesHistory(sessionUser.id, modelId);
  const commissionPercent = getConfig().commerce.platformCommissionBps / 100;

  return (
    <ProfileShell
      heading="Кабинет автора"
      active="author"
      showAuthorTab
      breadcrumb={
        <p className="mb-2 text-sm text-ink-muted">
          <Link href="/profile/author" className="hover:text-primary">
            Кабинет автора
          </Link>{" "}
          / Детализация модели
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="rounded-card border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-ink">{model.title}</h2>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div>
                <p className="text-xs text-ink-muted">Цена модели</p>
                <p className="mt-1 font-semibold text-ink">{formatPriceRub(model.price)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Продано копий</p>
                <p className="mt-1 font-semibold text-ink">{model.salesCount} шт.</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Валовая выручка</p>
                <p className="mt-1 font-semibold text-ink">{formatPriceRub(model.grossRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Комиссия ({commissionPercent}%)</p>
                <p className="mt-1 font-semibold text-ink-muted">
                  {formatPriceRub(model.grossRevenue - model.netEarnings)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Ваш чистый доход</p>
                <p className="mt-1 font-semibold text-success">{formatPriceRub(model.netEarnings)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
            <h2 className="border-b border-border px-6 py-4 text-lg font-bold text-ink">
              История продаж модели
            </h2>
            {sales.length === 0 ? (
              <p className="px-6 py-8 text-sm text-ink-muted">Пока не было ни одной продажи.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Дата</th>
                      <th className="px-6 py-3 text-left font-semibold">Покупатель</th>
                      <th className="px-6 py-3 text-right font-semibold">Стоимость покупки</th>
                      <th className="px-6 py-3 text-left font-semibold">Статус выплаты</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.orderItemId} className="border-t border-border">
                        <td className="px-6 py-4 text-ink-muted">{formatDate(sale.soldAt)}</td>
                        <td className="px-6 py-4 text-ink">{sale.buyerName ?? sale.buyerEmail}</td>
                        <td className="px-6 py-4 text-right font-semibold text-ink">
                          {formatPriceRub(sale.priceAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-success">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                            Начислено
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="h-fit rounded-card border border-border bg-surface p-6">
          <p className="text-sm text-ink-muted">Баланс автора</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {formatPriceRub(dashboard.balance.availableForPayout)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">Доступно к моментальной выплате</p>
          <div className="mt-5">
            <PayoutRequestButton
              availableForPayout={dashboard.balance.availableForPayout}
              minPayoutAmount={MIN_PAYOUT_AMOUNT}
              disabled={dashboard.balance.availableForPayout < MIN_PAYOUT_AMOUNT}
            />
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
