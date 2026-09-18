import { listPublishedModelSlugsForSitemap } from "../infrastructure/model-repository";

/** Used by `src/app/sitemap.ts` (ТЗ §47) to enumerate every crawlable model URL. */
export async function listPublishedModelSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return listPublishedModelSlugsForSitemap();
}
