import "server-only";
import type { SeoTagPage, TagAdminSummary, TagSummary } from "../domain/tag";
import {
  findSeoTagPageBySlug,
  listSeoIndexedTagSlugs,
  listTagsForAdmin,
  listTagsPublic,
} from "../infrastructure/prisma-tag-repository";

/** Public catalog filter pills / admin model-form tag picker. */
export async function listTags(): Promise<TagSummary[]> {
  return listTagsPublic();
}

/** /admin/tags — includes usage counts. */
export async function listTagsWithUsage(): Promise<TagAdminSummary[]> {
  return listTagsForAdmin();
}

/** /tag/[slug] — null for any tag that isn't opted into SEO indexing (or doesn't exist), so the route 404s. */
export async function getSeoTagPage(slug: string): Promise<SeoTagPage | null> {
  if (!slug) return null;
  return findSeoTagPageBySlug(slug);
}

/** sitemap.ts — every currently SEO-indexed tag. */
export async function listSeoTagSlugs(): Promise<{ slug: string }[]> {
  return listSeoIndexedTagSlugs();
}
