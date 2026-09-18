import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@modules/auth";
import { getAuthorDashboard, isAuthor, MIN_PAYOUT_AMOUNT } from "@modules/authors";
import { formatPriceRub } from "@modules/models";
import { getConfig } from "@shared/config";
import { clsx } from "@shared/utils/clsx";
import { ProfileShell } from "../_components/profile-shell";
import { PayoutRequestButton } from "./_components/payout-request-button";

export const metadata: Metadata = { title: "Кабинет автора" };

const STATUS_LABEL = { DRAFT: "Черновик", PUBLISHED: "Опубликовано", HIDDEN: "Скрыта" } as const;
const STATUS_CLASS = {
  DRAFT: "bg-warning-bg text-warning",
  PUBLISHED: "bg-success-bg text-success",
  HIDDEN: "bg-surface-alt text-ink-muted",
} as const;

export default async function AuthorPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const authorFlag = await isAuthor(sessionUser.id);
  if (!authorFlag) {
    redirect("/profile");
  }

  const dashboard = await getAuthorDashboard(sessionUser.id);
  const commissionPercent = getConfig().commerce.platformCommissionBps / 100;

  return (
    <ProfileShell
      heading="Кабинет автора"
      active="author"
      showAuthorTab
      headerRight={
        <Link
          href="/custom-order"
          className="rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          + Загрузить новую модель
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="text-lg font-bold text-ink">
            Ваши опубликованные 3D-модели ({dashboard.models.length})
          </h2>

          <div className="mt-5 flex flex-col gap-4">
            {dashboard.models.map((model) => (
              <div
                key={model.modelId}
                className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span
                    className={clsx(
                      "inline-block rounded-full px-2.5 py-1 text-xs font-semibold",
                      STATUS_CLASS[model.status],
                    )}
                  >
                    {STATUS_LABEL[model.status]}
                  </span>
                  <h3 className="mt-2 font-semibold text-ink">{model.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Цена: <span className="font-medium text-ink">{formatPriceRub(model.price)}</span>
                    {" · "}
                    Продажи: <span className="font-medium text-ink">{model.salesCount} шт</span>
                    {" · "}
                    Ваш доход (нетто):{" "}
                    <span className="font-semibold text-primary">{formatPriceRub(model.netEarnings)}</span>
                  </p>
                </div>
                <Link
                  href={`/profile/author/${model.modelId}`}
                  className="shrink-0 rounded-control border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-alt"
                >
                  Статистика
                </Link>
              </div>
            ))}

            {dashboard.models.length === 0 ? (
              <p className="rounded-card border border-border bg-surface p-6 text-sm text-ink-muted">
                У вас пока нет моделей на площадке.
              </p>
            ) : null}
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

          <div className="mt-6 space-y-1.5 border-t border-border pt-5 text-xs text-ink-muted">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Информация для автора
            </p>
            <p>• Комиссия маркетплейса: {commissionPercent}%</p>
            <p>• Минимальная сумма вывода: {formatPriceRub(MIN_PAYOUT_AMOUNT)}</p>
            <p>• Перевод на карту Самозанятого или ИП</p>
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
