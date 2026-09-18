import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@modules/auth";
import { listUserOrderHistory, type OrderHistoryItem } from "@modules/orders";
import { isAuthor } from "@modules/authors";
import { formatPriceRub } from "@modules/models";
import { clsx } from "@shared/utils/clsx";
import { ProfileShell } from "../_components/profile-shell";

export const metadata: Metadata = { title: "История платежей" };

const STATUS_LABEL: Record<OrderHistoryItem["status"], string> = {
  PAID: "Оплачено",
  PENDING_PAYMENT: "Ожидает оплаты",
  CANCELLED: "Отменён",
  REFUNDED: "Возврат",
};

const STATUS_CLASS: Record<OrderHistoryItem["status"], string> = {
  PAID: "bg-success-bg text-success",
  PENDING_PAYMENT: "bg-warning-bg text-warning",
  CANCELLED: "bg-surface-alt text-ink-muted",
  REFUNDED: "bg-danger-bg text-danger",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function PaymentsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const [orders, authorFlag] = await Promise.all([
    listUserOrderHistory(sessionUser.id),
    isAuthor(sessionUser.id),
  ]);

  const paidOrders = orders.filter((order) => order.status === "PAID");
  const totalPaid = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const modelsPurchased = paidOrders.reduce((sum, order) => sum + order.itemTitles.length, 0);

  return (
    <ProfileShell heading="Личный кабинет" active="payments" showAuthorTab={authorFlag}>
      {orders.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-6 py-16 text-center">
          <h2 className="text-lg font-bold text-ink">Платежей пока нет</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Здесь появится история ваших заказов после первой покупки.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <h2 className="border-b border-border px-6 py-4 text-lg font-bold text-ink">
              История транзакций
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Дата</th>
                    <th className="px-6 py-3 text-left font-semibold">Товар или услуга</th>
                    <th className="px-6 py-3 text-right font-semibold">Сумма</th>
                    <th className="px-6 py-3 text-left font-semibold">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.orderId} className="border-t border-border">
                      <td className="px-6 py-4 text-ink-muted">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-ink">{order.itemTitles.join(", ")}</p>
                        {order.providerPaymentId ? (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            ID транзакции: #{order.providerPaymentId.slice(-8).toUpperCase()}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-ink">
                        {formatPriceRub(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            STATUS_CLASS[order.status],
                          )}
                        >
                          {STATUS_LABEL[order.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="h-fit rounded-card border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-ink">Сводка расходов</h2>
            <p className="mt-4 text-sm text-ink-muted">Всего успешно оплачено</p>
            <p className="text-2xl font-bold text-primary">{formatPriceRub(totalPaid)}</p>

            <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Куплено моделей</dt>
                <dd className="font-medium text-ink">{modelsPurchased} шт</dd>
              </div>
            </dl>

            <p className="mt-5 flex items-start gap-2 text-xs text-ink-muted">
              <span aria-hidden>🛡️</span>
              Все чеки отправлены на {sessionUser.email}
            </p>
          </div>
        </div>
      )}
    </ProfileShell>
  );
}
