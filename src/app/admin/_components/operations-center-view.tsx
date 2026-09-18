import type { OperationsOverview } from "@modules/admin";
import { formatPriceRub } from "@modules/models";
import { StatusBadge, type BadgeTone } from "./status-badge";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Ожидает",
  PAID: "Успешно",
  FAILED: "Ошибка",
  REFUNDED: "Возврат",
};

const PAYMENT_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
};

/**
 * Shared content for both /admin/users and /admin/payments — the PDF
 * sidebar has two separate nav entries ("Пользователи" / "Платежи") but its
 * mockup (page 12, part 5) shows one combined "Операционный центр" screen
 * for both. Rather than splitting the data across two thin, half-empty
 * pages, both routes render this same combined view — simplest reading
 * that still gives each nav entry a working destination.
 */
export function OperationsCenterView({ overview }: { overview: OperationsOverview }) {
  return (
    <>
      <p className="mt-6 border-b border-border pb-3 text-sm font-semibold text-primary">Пользователи и Финансы</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-sm font-bold text-ink">Зарегистрированные покупатели</h2>
          {overview.buyers.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Покупок пока не было</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="pb-2 font-semibold">Имя / Email</th>
                  <th className="pb-2 text-right font-semibold">Моделей</th>
                  <th className="pb-2 text-right font-semibold">Сумма покупок</th>
                </tr>
              </thead>
              <tbody>
                {overview.buyers.map((buyer) => (
                  <tr key={buyer.id} className="border-t border-border">
                    <td className="py-3">
                      <p className="font-medium text-ink">{buyer.name ?? buyer.email}</p>
                      <p className="text-xs text-ink-muted">{buyer.email}</p>
                    </td>
                    <td className="py-3 text-right text-ink-muted">{buyer.modelsPurchased} шт.</td>
                    <td className="py-3 text-right font-semibold text-ink">{formatPriceRub(buyer.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-sm font-bold text-ink">Последние платежи</h2>
          {overview.payments.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Платежей пока не было</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {overview.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {payment.modelTitles.join(", ") || "Заказ"}
                    </p>
                    <p className="text-xs text-ink-muted">
                      TXN-{payment.providerPaymentId.slice(-4).toUpperCase()} · Способ оплаты: {payment.provider}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink">{formatPriceRub(payment.amount)}</p>
                    <StatusBadge
                      label={PAYMENT_STATUS_LABEL[payment.status] ?? payment.status}
                      tone={PAYMENT_STATUS_TONE[payment.status] ?? "neutral"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
