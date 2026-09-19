import { listRandomCatalogModels } from "../infrastructure/catalog-repository";
import type { CatalogModelCard } from "../domain/catalog";

/** Homepage "Случайные рекомендации" section — a random sample of published models. */
export async function getRandomModels(limit: number): Promise<CatalogModelCard[]> {
  return listRandomCatalogModels(limit);
}
