import type { Prisma } from "@prisma/client";
import type { CatalogSort } from "./catalog";

/**
 * Pure mapping from a sort mode to a Prisma `orderBy` clause — no DB access
 * (only imports Prisma's TYPES), so this is safe to unit test directly.
 *
 * Every branch ends with a deterministic tie-break so pagination never skips
 * or repeats a row when many models share the same primary sort key (e.g.
 * several unsold models all have a popularity count of 0).
 */
export function buildCatalogOrderBy(
  sort: CatalogSort | undefined,
): Prisma.ModelOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "asc" }];
    case "newest":
      return [{ publishedAt: "desc" }, { id: "asc" }];
    case "popular":
    default:
      // Popularity is approximated by UserModelOwnership count (ТЗ has no
      // view/purchase-count tracking yet). Falls back to 0 for unsold
      // models via Prisma's relation-count orderBy (LEFT JOIN semantics —
      // no ownerships required). Ties broken by newest first, then id.
      return [{ ownerships: { _count: "desc" } }, { publishedAt: "desc" }, { id: "asc" }];
  }
}
