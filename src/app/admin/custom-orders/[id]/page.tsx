import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomOrderDetail, CONTACT_TYPE_LABELS } from "@modules/custom-orders";
import { listAuditLogs } from "@modules/audit";
import { PageHeader } from "../../_components/page-header";
import { StatusBadge } from "../../_components/status-badge";
import { STATUS_LABEL, STATUS_TONE } from "../_status";
import { CustomOrderStatusPanel } from "../_components/custom-order-status-panel";
import { DownloadAttachmentLink } from "../_components/download-attachment-link";

export const metadata: Metadata = { title: "Заявка" };

function formatDateTime(date: Date): string {
  return (
    date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" }) +
    ", " +
    date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default async function AdminCustomOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getCustomOrderDetail(id);
  if (!order) {
    notFound();
  }

  const auditPage = await listAuditLogs({ entityType: "CustomOrder", entityId: id, pageSize: 20 });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader
        title={`Заявка #MD-${order.id.slice(-4).toUpperCase()}`}
        subtitle="Разработка 3D-модели под задачу клиента"
        action={<StatusBadge label={STATUS_LABEL[order.status]} tone={STATUS_TONE[order.status]} />}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-sm font-bold text-ink">Детали заказа</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Заказчик</p>
              <p className="mt-1 text-sm font-semibold text-ink">{order.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Контакты</p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {order.contactValue} ({CONTACT_TYPE_LABELS[order.contactType]})
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Описание задачи от клиента</p>
            <p className="mt-2 whitespace-pre-line text-sm text-ink">{order.description}</p>
          </div>

          {order.files.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Прикреплённые чертежи/эскизы</p>
              <ul className="mt-3 space-y-2">
                {order.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-control bg-surface-alt px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{file.originalName}</p>
                      <p className="text-xs text-ink-muted">{formatFileSize(file.size)}</p>
                    </div>
                    <DownloadAttachmentLink customOrderId={order.id} fileId={file.id} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="text-sm font-bold text-ink">Статус и управление</h2>
            <CustomOrderStatusPanel orderId={order.id} currentStatus={order.status} />
          </div>

          <div className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="text-sm font-bold text-ink">История изменений</h2>
            {auditPage.items.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                Заявка отправлена {formatDateTime(order.createdAt)} — изменений статуса пока не было.
              </p>
            ) : (
              <ul className="mt-4 space-y-3 border-l border-border pl-4">
                {auditPage.items.map((entry) => {
                  const meta = entry.metadata as { from?: string; to?: string } | undefined;
                  return (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs text-ink-muted">{formatDateTime(entry.timestamp)}</p>
                      <p className="text-sm text-ink">
                        {meta?.from && meta?.to
                          ? `Статус изменён: ${STATUS_LABEL[meta.from as keyof typeof STATUS_LABEL] ?? meta.from} → ${STATUS_LABEL[meta.to as keyof typeof STATUS_LABEL] ?? meta.to}`
                          : entry.event}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
