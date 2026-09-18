import type { Metadata } from "next";
import { listCatalog, listCatalogTags, CATALOG_SORTS } from "@modules/catalog";
import type { CatalogSort } from "@modules/catalog";
import { ModelCard } from "../_components/model-card";
import { SearchBar } from "../_components/search-bar";
import { TagPills } from "./_components/tag-pills";
import { SortSelect } from "./_components/sort-select";
import { PaginationNav } from "./_components/pagination-nav";

export const metadata: Metadata = {
  title: "Каталог моделей",
  description:
    "Каталог проверенных 3D-моделей в формате STL: органайзеры, декор и интерьер, инструменты, авто и другое.",
};

interface CatalogPageProps {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; page?: string }>;
}

function parseSort(raw: string | undefined): CatalogSort {
  return CATALOG_SORTS.includes(raw as CatalogSort) ? (raw as CatalogSort) : "popular";
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
