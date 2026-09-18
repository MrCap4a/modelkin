export type CatalogSort = "popular" | "newest" | "price_asc" | "price_desc";

export const CATALOG_SORTS: readonly CatalogSort[] = [
  "popular",
  "newest",
  "price_asc",
  "price_desc",
] as const;

export interface CatalogModelCard {
  id: string;
  slug: string;
  title: string;
  /** Price in kopecks. */
  price: number;
  imageUrl: string | null;
  /** First tag assigned to the model, if any — shown as a pill on the card. */
  tag: { slug: string; name: string } | null;
}

export interface CatalogListParams {
  query?: string;
  tagSlug?: string;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}

export interface CatalogListResult {
  items: CatalogModelCard[];
  total: number;
  page: number;
  pageSize: number;
}

/** Matches the 4-column x 2-row grid shown in design.pdf's catalog page. */
export const CATALOG_DEFAULT_PAGE_SIZE = 8;
export const CATALOG_MAX_PAGE_SIZE = 48;
