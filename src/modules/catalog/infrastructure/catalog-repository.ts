import type { Prisma } from "@prisma/client";
import { prisma } from "@infrastructure/database";
import { getPublicObjectUrl } from "@infrastructure/storage";
import { buildCatalogOrderBy } from "../domain/build-order-by";
import type { CatalogModelCard, CatalogSort } from "../domain/catalog";

interface RepoListParams {
  query?: string;
  tagSlug?: string;
  sort: CatalogSort;
  skip: number;
  take: number;
}

/**
 * ТЗ §16: search must cover title, description AND tags, accounting for
 * Russian text. `Model.searchVector` (russian tsvector, title weight A /
 * description weight B, GIN-indexed — see DATABASE.md) covers title+
 * description; tag name matching is a separate join since a tag lives in
 * another table and can't participate in the single-column generated
 * tsvector (see the migration comment in
 * prisma/migrations/20260918151537_model_search_vector). The two are
 * combined with OR so a query matches by either.
 *
 * Returns candidate model ids only — the caller re-fetches full rows via
 * Prisma's query builder so pagination/sort/include stay type-safe and
 * consistent between the search and no-search code paths.
 */
async function findSearchMatchedModelIds(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT m.id
    FROM "Model" m
    LEFT JOIN "ModelTag" mt ON mt."modelId" = m.id
    LEFT JOIN "Tag" t ON t.id = mt."tagId"
    WHERE m.status = 'PUBLISHED'
      AND (
        m."searchVector" @@ plainto_tsquery('russian', ${trimmed})
        OR t.name ILIKE ${`%${trimmed}%`}
      )
  `;

  return rows.map((row) => row.id);
}

export async function listCatalogModels(
  params: RepoListParams,
): Promise<{ items: CatalogModelCard[]; total: number }> {
  const { query, tagSlug, sort, skip, take } = params;

  let matchedIds: string[] | null = null;
  if (query) {
    matchedIds = await findSearchMatchedModelIds(query);
    if (matchedIds.length === 0) {
      // Short-circuit: no model matches the search text at all, so there's
      // no point building/running the (potentially expensive) main query.
      return { items: [], total: 0 };
    }
  }

  const where: Prisma.ModelWhereInput = {
    status: "PUBLISHED",
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
    ...(matchedIds ? { id: { in: matchedIds } } : {}),
  };

  const orderBy = buildCatalogOrderBy(sort);

  const [total, rows] = await Promise.all([
    prisma.model.count({ where }),
    prisma.model.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        tags: { include: { tag: true }, take: 1 },
      },
    }),
  ]);

  const items: CatalogModelCard[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    imageUrl: row.images[0] ? getPublicObjectUrl(row.images[0].storageKey) : null,
    tag: row.tags[0] ? { slug: row.tags[0].tag.slug, name: row.tags[0].tag.name } : null,
  }));

  return { items, total };
}
