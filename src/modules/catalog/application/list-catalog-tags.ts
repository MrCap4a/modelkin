import { CATALOG_TAGS } from "@shared/constants/catalog-tags";

/**
 * Re-exports the single canonical tag list (also used by the seed script and
 * the footer) as the catalog filter pills — never invent a second tag list.
 */
export function listCatalogTags(): { slug: string; name: string }[] {
  return CATALOG_TAGS.map((tag) => ({ slug: tag.slug, name: tag.name }));
}
