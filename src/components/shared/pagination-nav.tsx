import Link from "next/link";
import { clsx } from "@shared/utils/clsx";

const MAX_VISIBLE_PAGES = 5;

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

/**
 * Used by both /models (filters/search) and /tag/{slug} (SEO audit,
 * 2026-09-21) — moved here from models/_components/ once a second route
 * needed it, per the "cross-route UI lives in components/shared/" rule
 * (see ARCHITECTURE.md).
 */
export function PaginationNav({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = visiblePageNumbers(page, totalPages);

  function arrowClass(disabled: boolean): string {
    return clsx(
      "flex h-9 w-9 items-center justify-center rounded-control border border-border text-ink transition-colors",
      disabled ? "pointer-events-none opacity-40" : "hover:border-primary/40 hover:text-primary",
    );
  }

  return (
    <nav aria-label="Пагинация" className="flex items-center gap-2">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-label="Предыдущая страница"
        aria-disabled={page <= 1}
        className={arrowClass(page <= 1)}
      >
        ←
      </Link>

      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          aria-current={p === page ? "page" : undefined}
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

      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-label="Следующая страница"
        aria-disabled={page >= totalPages}
        className={arrowClass(page >= totalPages)}
      >
        →
      </Link>
    </nav>
  );
}
