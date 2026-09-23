import type { Metadata } from "next";
import { listCatalog, listCatalogTags, CATALOG_SORTS } from "@modules/catalog";
import type { CatalogSort } from "@modules/catalog";
import { getConfig } from "@shared/config";
import { ModelCard } from "../_components/model-card";
import { SearchBar } from "../_components/search-bar";
import { TagPills } from "./_components/tag-pills";
import { SortSelect } from "./_components/sort-select";
import { PaginationNav } from "@components/shared/pagination-nav";

interface CatalogPageProps {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; page?: string }>;
}

function parseSort(raw: string | undefined): CatalogSort {
  return CATALOG_SORTS.includes(raw as CatalogSort) ? (raw as CatalogSort) : "popular";
}

/**
 * A plain `export const metadata` used to cover this page, which meant
 * every combination of search/tag/sort/page query params shared one
 * identical <title>/description with no canonical and no noindex — i.e.
 * search engines could index unbounded ?q=/?tag=/?page= variants as
 * duplicate content (SEO audit, 2026-09-21). Only the clean /models (no
 * params, page 1) stays indexable; every filtered/searched/paginated
 * variant is noindex,follow — the links on it still get crawled, it just
 * isn't itself a distinct indexable page. A tag admins want as a real
 * indexable page gets a dedicated /tag/{slug} route instead (see
 * ARCHITECTURE.md) — the filter itself never becomes one automatically.
 */
export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const hasFilters = Boolean(sp.q || sp.tag || (sp.sort && sp.sort !== "popular"));
  const requestedPage = Number(sp.page);
  const isPaginated = Number.isFinite(requestedPage) && requestedPage > 1;

  const isNoindex = hasFilters || isPaginated;

  return {
    title: "Каталог моделей",
    description:
      "Каталог проверенных 3D-моделей в формате STL: органайзеры, декор и интерьер, инструменты, авто и другое.",
    // No canonical at all on filtered/paginated variants — mixing noindex
    // with a canonical pointing at a different URL sends crawlers a mixed
    // signal (Google's own faceted-navigation guidance: prefer plain
    // noindex over canonical-to-elsewhere for URLs you want excluded).
    alternates: isNoindex ? undefined : { canonical: `${getConfig().appUrl}/models` },
    robots: isNoindex ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const tag = sp.tag || undefined;
  const sort = parseSort(sp.sort);
  const requestedPage = Number(sp.page);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const [result, tags] = await Promise.all([
    listCatalog({ query: q, tagSlug: tag, sort, page }),
    Promise.resolve(listCatalogTags()),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function buildHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    if (sort !== "popular") params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/models${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Магазин 3D-моделей</h1>
      <p className="mt-2 text-ink-muted">
        Каждая модель проверена реальной тестовой печатью и готова к слайсингу
      </p>

      <div className="mt-6">
        <SearchBar
          defaultValue={q}
          hiddenFields={{ tag, sort: sort !== "popular" ? sort : undefined }}
          placeholder="Быстрый поиск среди сотен проверенных STL файлов…"
        />
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TagPills
          tags={tags}
          activeTagSlug={tag}
          currentParams={{ q, sort: sort !== "popular" ? sort : undefined }}
        />
        <SortSelect value={sort} />
      </div>

      {result.items.length === 0 ? (
        <div className="mt-16 rounded-card border border-border bg-surface p-10 text-center text-ink-muted">
          По вашему запросу ничего не найдено. Попробуйте изменить фильтры или поисковый запрос.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {result.items.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <PaginationNav page={result.page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
