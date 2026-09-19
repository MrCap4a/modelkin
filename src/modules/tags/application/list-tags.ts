import "server-only";
import type { TagAdminSummary, TagSummary } from "../domain/tag";
import { listTagsForAdmin, listTagsPublic } from "../infrastructure/prisma-tag-repository";

/** Public catalog filter pills / admin model-form tag picker. */
export async function listTags(): Promise<TagSummary[]> {
  return listTagsPublic();
}

/** /admin/tags — includes usage counts. */
export async function listTagsWithUsage(): Promise<TagAdminSummary[]> {
  return listTagsForAdmin();
}
