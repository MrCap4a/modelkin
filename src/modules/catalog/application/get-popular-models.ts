import { listCatalog } from "./list-catalog";
import type { CatalogModelCard } from "../domain/catalog";

/** Homepage "Популярно на этой неделе" section (design.pdf, page 1). */
export async function getPopularModels(limit: number): Promise<CatalogModelCard[]> {
  const result = await listCatalog({ sort: "popular", page: 1, pageSize: limit });
  return result.items;
}
