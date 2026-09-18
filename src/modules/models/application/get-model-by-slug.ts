import { findPublishedModelDetailBySlug } from "../infrastructure/model-repository";
import type { ModelDetail } from "../domain/model";

/**
 * Public catalog use case: returns a model's full detail view by slug, or
 * `null` when it doesn't exist OR isn't PUBLISHED (a DRAFT/HIDDEN model must
 * 404 for public visitors even if they know the exact slug — ТЗ §29 admin
 * publish/hide flow is the only thing that changes this).
 */
export async function getModelBySlug(slug: string): Promise<ModelDetail | null> {
  if (!slug) return null;
  return findPublishedModelDetailBySlug(slug);
}
