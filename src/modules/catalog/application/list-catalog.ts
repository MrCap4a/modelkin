import { listCatalogModels } from "../infrastructure/catalog-repository";
import { computeSkip, normalizePage, normalizePageSize } from "../domain/pagination";
import { CATALOG_DEFAULT_PAGE_SIZE, CATALOG_MAX_PAGE_SIZE, CATALOG_SORTS } from "../domain/catalog";
import type { CatalogListParams, CatalogListResult, CatalogSort } from "../domain/catalog";

function normalizeSort(sort: string | undefined): CatalogSort {
  return CATALOG_SORTS.includes(sort as CatalogSort) ? (sort as CatalogSort) : "popular";
}

/**
 * Search/filter/sort/pagination over PUBLISHED models — ТЗ §16. Params are
 * untrusted (they come straight from URL search params), so everything is
 * normalized/clamped here rather than trusted from the caller.
 */
export async function listCatalog(params: CatalogListParams): Promise<CatalogListResult> {
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize, CATALOG_DEFAULT_PAGE_SIZE, CATALOG_MAX_PAGE_SIZE);
  const sort = normalizeSort(params.sort);
  const skip = computeSkip(page, pageSize);

  const query = params.query?.trim();

  const { items, total } = await listCatalogModels({
    query: query ? query : undefined,
    tagSlug: params.tagSlug || undefined,
    sort,
    skip,
    take: pageSize,
  });

  return { items, total, page, pageSize };
}
