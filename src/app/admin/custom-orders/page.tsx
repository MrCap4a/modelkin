import type { Metadata } from "next";
import Link from "next/link";
import {
  listCustomOrders,
  CONTACT_TYPE_LABELS,
  type CustomOrderStatus,
} from "@modules/custom-orders";
import { clsx } from "@shared/utils/clsx";
import { PageHeader } from "../_components/page-header";
import { StatusBadge } from "../_components/status-badge";
import { STATUS_LABEL, STATUS_TONE } from "./_status";

export const metadata: Metadata = { title: "Заявки на индивидуальный заказ" };

const TABS: { value: CustomOrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все заявки" },
  { value: "NEW", label: "Новые" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "WAITING_FOR_REPLY", label: "Ожидают ответа" },
  { value: "COMPLETED", label: "Выполненные" },
];

function formatDate(date: Date): string {
  return (
    date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" }) +
    ", " +
    date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  );
}

function isValidStatus(value: string | undefined): value is CustomOrderStatus {
  return (
    value === "NEW" ||
    value === "IN_PROGRESS" ||
    value === "WAITING_FOR_REPLY" ||
    value === "COMPLETED" ||
    value === "CANCELLED"
  );
}

export default async function AdminCustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const activeStatus = isValidStatus(sp.status) ? sp.status : "ALL";

  const allOrders = await listCustomOrders();
  const counts: Record<CustomOrderStatus, number> = {
    NEW: 0,
    IN_PROGRESS: 0,
    WAITING_FOR_REPLY: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
  for (const order of allOrders) {
    counts[order.status] += 1;
  }

  const visibleOrders =
    activeStatus === "ALL" ? allOrders : allOrders.filter((order) => order.status === activeStatus);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader
        title="Заявки на индивидуальный заказ"
        subtitle="Разработка 3D-моделей под задачи клиентов"
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = tab.value === "ALL" ? allOrders.length : counts[tab.value];
          const active = activeStatus === tab.value;
          const href =
            tab.value === "ALL"
              ? "/admin/custom-orders"
              : `/admin/custom-orders?status=${tab.value}`;
          return (
            <Link
              key={tab.value}
              href={href}
              className={clsx(
                "rounded-control px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-ink text-white"
                  : "border border-border bg-surface text-ink hover:border-primary/40",
              )}
            >
              {tab.label}
              {tab.value !== "ALL" && count > 0 ? ` (${count})` : ""}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
        {visibleOrders.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">Заявок не найдено</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-6 py-3 font-semibold">ID заявки</th>
                <th className="px-6 py-3 font-semibold">Заказчик</th>
                <th className="px-6 py-3 font-semibold">Краткое описание задачи</th>
                <th className="px-6 py-3 font-semibold">Статус</th>
                <th className="px-6 py-3 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id} className="border-t border-border hover:bg-surface-alt/50">
                  <td className="px-6 py-3">
                    <p className="font-semibold text-ink">#MD-{order.id.slice(-4).toUpperCase()}</p>
                    <p className="text-xs text-ink-muted">{formatDate(order.createdAt)}</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-ink">{order.name}</p>
                    <p className="text-xs text-ink-muted">
                      {CONTACT_TYPE_LABELS[order.contactType]}: {order.contactValue}
                    </p>
                  </td>
                  <td className="max-w-xs truncate px-6 py-3 text-ink-muted">
                    {order.description}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      label={STATUS_LABEL[order.status]}
                      tone={STATUS_TONE[order.status]}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/admin/custom-orders/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      Открыть →
                    </Link>
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
