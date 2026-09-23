export interface TagSummary {
  id: string;
  slug: string;
  name: string;
}

/**
 * Admin list view — includes how many models use the tag (for a
 * safe-delete decision) and its full SEO override state (fetched eagerly
 * alongside the rest of the list so the admin tags table can expand a
 * tag's SEO panel inline without a second round trip).
 */
export interface TagAdminSummary extends TagSummary {
  modelCount: number;
  seoIndexed: boolean;
  seoTitle: string | null;
  seoH1: string | null;
  seoDescription: string | null;
}

/** Admin edit view for the SEO-override fields of one tag. */
export interface TagSeoDetail {
  id: string;
  slug: string;
  name: string;
  seoIndexed: boolean;
  seoTitle: string | null;
  seoH1: string | null;
  seoDescription: string | null;
}

/** Public /tag/{slug} landing page — only ever returned when seoIndexed is true. */
export interface SeoTagPage {
  slug: string;
  name: string;
  seoTitle: string | null;
  seoH1: string | null;
  seoDescription: string | null;
}
