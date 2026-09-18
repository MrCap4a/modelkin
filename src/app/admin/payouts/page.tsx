import type { Metadata } from "next";
import Link from "next/link";
import { listAllPayoutRequests, type PayoutStatus } from "@modules/authors";
import { formatPriceRub } from "@modules/models";
import { clsx } from "@shared/utils/clsx";
import { PageHeader } from "../_components/page-header";
import { StatusBadge, type BadgeTone } from "../_components/status-badge";
import { PayoutStatusSelect } from "./_components/payout-status-select";

export const metadata: Metadata = { title: "Выплаты авторам" };

const FILTERS: { value: PayoutStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "REQUESTED", label: "Запрошенные" },
  { value: "PROCESSING", label: "В обработке" },
  { value: "PAID", label: "Выплаченные" },
  { value: "REJECTED", label: "Отклонённые" },
];

const STATUS_LABEL: Record<PayoutStatus, string> = {
  REQUESTED: "Запрошена",
  PROCESSING: "В обработке",
  PAID: "Выплачена",
  REJECTED: "Отклонена",
};

const STATUS_TONE: Record<PayoutStatus, BadgeTone> = {
  REQUESTED: "warning",
  PROCESSING: "info",
  PAID: "success",
  REJECTED: "danger",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isValidStatus(value: string | undefined): value is PayoutStatus {
  return value === "REQUESTED" || value === "PROCESSING" || value === "PAID" || value === "REJECTED";
}

/**
 * ТЗ §28 requires "Выплаты авторам" in the admin nav, and this is the piece
 * that makes the already-built author payout request flow (@modules/authors
 * — request-payout.ts) actually actionable: without an admin-side status
 * transition, a REQUESTED payout could never move to PROCESSING/PAID/REJECTED.
 * No PDF mockup exists for this screen — visual language matches the
 * Models/Заявки list screens (filter pills + data table).
 */
export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = isValidStatus(sp.status) ? sp.status : undefined;
  const payouts = await listAllPayoutRequests({ status });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader title="Выплаты авторам" subtitle="Заявки на вывод заработанных средств авторов моделей" />

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = (status ?? "ALL") === filter.value;
          const href = filter.value === "ALL" ? "/admin/payouts" : `/admin/payouts?status=${filter.value}`;
          return (
            <Link
              key={filter.value}
              href={href}
              className={clsx(
                "rounded-control px-4 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-white" : "border border-border bg-surface text-ink hover:border-primary/40",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
        {payouts.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">Заявок на выплату не найдено</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-6 py-3 font-semibold">Получатель</th>
                <th className="px-6 py-3 font-semibold">Реквизиты</th>
                <th className="px-6 py-3 font-semibold">Сумма</th>
                <th className="px-6 py-3 font-semibold">Дата заявки</th>
                <th className="px-6 py-3 font-semibold">Статус</th>
                <th className="px-6 py-3 text-right font-semibold">Действие</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-border">
                  <td className="px-6 py-3 font-medium text-ink">{payout.bankDetails.recipientName}</td>
                  <td className="px-6 py-3 text-ink-muted">
                    {payout.bankDetails.bankName} · {payout.bankDetails.accountNumber}
                  </td>
                  <td className="px-6 py-3 font-semibold text-ink">{formatPriceRub(payout.amount)}</td>
                  <td className="px-6 py-3 text-ink-muted">{formatDate(payout.requestedAt)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[payout.status]} tone={STATUS_TONE[payout.status]} />
                  </td>
                  <td className="px-6 py-3">
                    <PayoutStatusSelect payoutId={payout.id} currentStatus={payout.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
