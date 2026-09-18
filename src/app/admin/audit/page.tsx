import type { Metadata } from "next";
import Link from "next/link";
import { listAuditLogs, type AuditEventName } from "@modules/audit";
import { clsx } from "@shared/utils/clsx";
import { PageHeader } from "../_components/page-header";
import { AUDIT_EVENT_NAMES } from "./_event-names";

export const metadata: Metadata = { title: "Audit" };

const PAGE_SIZE = 25;
const MAX_VISIBLE_PAGES = 7;

function visiblePageNumbers(page: number, totalPages: number): number[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(MAX_VISIBLE_PAGES / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
  start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function isValidEvent(value: string | undefined): value is AuditEventName {
  return !!value && (AUDIT_EVENT_NAMES as string[]).includes(value);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDateTime(date: Date): string {
  return (
    date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; actorUserId?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const event = isValidEvent(sp.event) ? sp.event : undefined;
  const actorUserId = sp.actorUserId?.trim() || undefined;
  const from = parseDate(sp.from);
  const to = parseDate(sp.to);
  const requestedPage = Number(sp.page);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const result = await listAuditLogs({ event, actorUserId, from, to, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function buildHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (event) params.set("event", event);
    if (actorUserId) params.set("actorUserId", actorUserId);
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader title="Audit log" subtitle="Журнал критических административных и коммерческих событий (ТЗ §30)" />

      <form method="get" className="mt-6 grid grid-cols-1 gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <label htmlFor="event" className="block text-xs font-medium text-ink-muted">
            Тип события
          </label>
          <select
            id="event"
            name="event"
            defaultValue={event ?? ""}
            className="mt-1 w-full rounded-control border border-border bg-background px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Все события</option>
            {AUDIT_EVENT_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="actorUserId" className="block text-xs font-medium text-ink-muted">
            ID пользователя
          </label>
          <input
            id="actorUserId"
            name="actorUserId"
            type="text"
            defaultValue={actorUserId}
            placeholder="cln1a2b3c…"
            className="mt-1 w-full rounded-control border border-border bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="from" className="block text-xs font-medium text-ink-muted">
            С даты
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={sp.from}
            className="mt-1 w-full rounded-control border border-border bg-background px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="to" className="block text-xs font-medium text-ink-muted">
              По дату
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={sp.to}
              className="mt-1 w-full rounded-control border border-border bg-background px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Найти
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
        {result.items.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">Событий не найдено</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-6 py-3 font-semibold">Время</th>
                <th className="px-6 py-3 font-semibold">Событие</th>
                <th className="px-6 py-3 font-semibold">Субъект</th>
                <th className="px-6 py-3 font-semibold">Объект</th>
                <th className="px-6 py-3 font-semibold">Request ID</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="px-6 py-3 text-ink-muted">{formatDateTime(entry.timestamp)}</td>
                  <td className="px-6 py-3 font-mono text-xs font-medium text-ink">{entry.event}</td>
                  <td className="px-6 py-3 text-ink-muted">
                    {entry.actorUserId ? (
                      <>
                        {entry.actorRole ?? "—"}
                        <span className="ml-1 font-mono text-xs">{entry.actorUserId.slice(-8)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-3 text-ink-muted">
                    {entry.entityType ? (
                      <>
                        {entry.entityType}
                        {entry.entityId && <span className="ml-1 font-mono text-xs">{entry.entityId.slice(-8)}</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-ink-muted">
                    {entry.requestId ? entry.requestId.slice(0, 8) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {visiblePageNumbers(page, totalPages).map((p) => (
            <Link
              key={p}
              href={buildHref(p)}
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-control border text-sm font-medium transition-colors",
                p === page
                  ? "border-primary bg-primary text-white"
                  : "border-border text-ink hover:border-primary/40 hover:text-primary",
              )}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
