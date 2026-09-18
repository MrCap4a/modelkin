import type { Metadata } from "next";
import Link from "next/link";
import { listModelsForAdmin, formatPriceRub, type ModelAdminStatus } from "@modules/models";
import { clsx } from "@shared/utils/clsx";
import { PageHeader } from "../_components/page-header";
import { StatusBadge, type BadgeTone } from "../_components/status-badge";

export const metadata: Metadata = { title: "Модели" };

const STATUS_FILTERS: { value: ModelAdminStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "PUBLISHED", label: "Опубликованные" },
  { value: "DRAFT", label: "Черновики" },
  { value: "HIDDEN", label: "Скрытые" },
];

const STATUS_LABEL: Record<ModelAdminStatus, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликована",
  HIDDEN: "Скрыта",
};

const STATUS_TONE: Record<ModelAdminStatus, BadgeTone> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  HIDDEN: "neutral",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function isValidStatus(value: string | undefined): value is ModelAdminStatus {
  return value === "DRAFT" || value === "PUBLISHED" || value === "HIDDEN";
}

export default async function AdminModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = isValidStatus(sp.status) ? sp.status : undefined;
  const query = sp.q?.trim() || undefined;

  const models = await listModelsForAdmin({ status, query });

  function buildHref(nextStatus: ModelAdminStatus | "ALL"): string {
    const params = new URLSearchParams();
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (query) params.set("q", query);
    const qs = params.toString();
    return `/admin/models${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader
        title="Каталог моделей"
        subtitle="Управление файлами и публикациями STL моделей"
        action={
          <Link
            href="/admin/models/new"
            className="rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            + Добавить модель
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const active = (status ?? "ALL") === filter.value;
            return (
              <Link
                key={filter.value}
                href={buildHref(filter.value)}
                className={clsx(
                  "rounded-control px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-white"
                    : "border border-border bg-surface text-ink hover:border-primary/40",
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        <form action="/admin/models" method="get" className="flex items-center">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Поиск моделей…"
            className="w-64 rounded-control border border-border bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
        {models.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">Моделей не найдено</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-6 py-3 font-semibold">Превью</th>
                <th className="px-2 py-3 font-semibold">Название</th>
                <th className="px-6 py-3 font-semibold">Категория</th>
                <th className="px-6 py-3 font-semibold">Цена</th>
                <th className="px-6 py-3 font-semibold">Дата добавления</th>
                <th className="px-6 py-3 font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id} className="border-t border-border hover:bg-surface-alt/50">
                  <td className="px-6 py-3">
                    <span className="block h-10 w-10 overflow-hidden rounded-control bg-surface-alt">
                      {model.previewImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- public S3 URL, not a local/optimizable asset
                        <img src={model.previewImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <Link
                      href={`/admin/models/${model.id}`}
                      className="font-medium text-ink hover:text-primary"
                    >
                      {model.title}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-ink-muted">{model.tags[0]?.name ?? "—"}</td>
                  <td className="px-6 py-3 font-semibold text-ink">{formatPriceRub(model.price)}</td>
                  <td className="px-6 py-3 text-ink-muted">{formatDate(model.createdAt)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[model.status]} tone={STATUS_TONE[model.status]} />
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
