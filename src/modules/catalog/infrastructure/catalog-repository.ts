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

type ModelRowForCard = Prisma.ModelGetPayload<{
  include: {
    images: true;
    tags: { include: { tag: true } };
  };
}>;

function toCatalogModelCard(row: ModelRowForCard): CatalogModelCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    imageUrl: row.images[0] ? getPublicObjectUrl(row.images[0].storageKey) : null,
    tag: row.tags[0] ? { slug: row.tags[0].tag.slug, name: row.tags[0].tag.name } : null,
  };
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

  return { items: rows.map(toCatalogModelCard), total };
}

/** Homepage "Случайные рекомендации" — a fresh random sample of published models on every load. */
export async function listRandomCatalogModels(limit: number): Promise<CatalogModelCard[]> {
  const idRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Model" WHERE status = 'PUBLISHED' ORDER BY random() LIMIT ${limit}
  `;
  const ids = idRows.map((row) => row.id);
  if (ids.length === 0) return [];

  const rows = await prisma.model.findMany({
    where: { id: { in: ids } },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      tags: { include: { tag: true }, take: 1 },
    },
  });

  // findMany doesn't preserve the `in` array's order — re-sort to match the
  // random order the raw query already picked.
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is (typeof rows)[number] => row !== undefined)
    .map(toCatalogModelCard);
}

/**
 * Model detail page "Похожие модели" (SEO audit, 2026-09-21) — other
 * PUBLISHED models sharing at least one tag with `excludeModelId`, for
 * internal linking between genuinely related pages rather than random
 * ones. Falls back to a random sample when the model has no tags or no
 * other model shares one, so the section is never empty without reason.
 */
export async function listRelatedCatalogModels(
  excludeModelId: string,
  tagSlugs: string[],
  limit: number,
): Promise<CatalogModelCard[]> {
  let ids: string[] = [];

  if (tagSlugs.length > 0) {
    // random() can't appear in ORDER BY alongside SELECT DISTINCT unless
    // it's itself in the select list — order the distinct id set in a
    // subquery instead.
    const idRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM (
        SELECT DISTINCT m.id
        FROM "Model" m
        JOIN "ModelTag" mt ON mt."modelId" = m.id
        JOIN "Tag" t ON t.id = mt."tagId"
        WHERE m.status = 'PUBLISHED'
          AND m.id != ${excludeModelId}
          AND t.slug = ANY(${tagSlugs})
      ) matched
      ORDER BY random()
      LIMIT ${limit}
    `;
    ids = idRows.map((row) => row.id);
  }

  if (ids.length < limit) {
    const fallbackRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Model"
      WHERE status = 'PUBLISHED' AND id != ${excludeModelId} AND id != ALL(${ids})
      ORDER BY random()
      LIMIT ${limit - ids.length}
    `;
    ids = [...ids, ...fallbackRows.map((row) => row.id)];
  }

  if (ids.length === 0) return [];

  const rows = await prisma.model.findMany({
    where: { id: { in: ids } },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      tags: { include: { tag: true }, take: 1 },
    },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is (typeof rows)[number] => row !== undefined)
    .map(toCatalogModelCard);
}
