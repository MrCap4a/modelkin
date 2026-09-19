import "server-only";
import { listTags } from "@modules/tags";

/** Catalog filter pills — reads the admin-managed tag list, not a hardcoded constant. */
export async function listCatalogTags(): Promise<{ slug: string; name: string }[]> {
  const tags = await listTags();
  return tags.map((tag) => ({ slug: tag.slug, name: tag.name }));
}
