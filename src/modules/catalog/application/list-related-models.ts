import { listRelatedCatalogModels } from "../infrastructure/catalog-repository";
import type { CatalogModelCard } from "../domain/catalog";

/** Model detail page "Похожие модели" — see catalog-repository.ts for the matching rule. */
export async function listRelatedModels(
  excludeModelId: string,
  tagSlugs: string[],
  limit: number,
): Promise<CatalogModelCard[]> {
  return listRelatedCatalogModels(excludeModelId, tagSlugs, limit);
}
