import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";

// `server-only` throws when required outside Next's "react-server" resolve
// condition, which Vitest doesn't provide — same pattern as
// model-admin-flow.test.ts.
vi.mock("server-only", () => ({}));

const { getModelBySlug } = await import("@modules/models/application/get-model-by-slug");
const { listPublishedModelSlugs } =
  await import("@modules/models/application/list-published-model-slugs");
const { listRelatedModels } = await import("@modules/catalog/application/list-related-models");

function unique(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("public model read side — SEO fields (SEO audit, 2026-09-21)", () => {
  const createdModelIds: string[] = [];
  const createdTagIds: string[] = [];

  afterAll(async () => {
    await prisma.modelTag.deleteMany({ where: { modelId: { in: createdModelIds } } });
    await prisma.model.deleteMany({ where: { id: { in: createdModelIds } } });
    await prisma.tag.deleteMany({ where: { id: { in: createdTagIds } } });
    await prisma.$disconnect();
  });

  it("getModelBySlug exposes seoTitle/seoDescription/noindex and each tag's seoIndexed flag", async () => {
    const tag = await prisma.tag.create({
      data: { name: unique("Индексируемый тег"), slug: unique("indexed-tag"), seoIndexed: true },
    });
    createdTagIds.push(tag.id);

    const slug = unique("model-seo-fields");
    const model = await prisma.model.create({
      data: {
        title: "Модель с SEO override",
        slug,
        description: "Обычное описание",
        price: 5_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
        seoTitle: "Ручной SEO title",
        seoDescription: "Ручное SEO description",
        noindex: true,
        tags: { create: [{ tagId: tag.id }] },
      },
    });
    createdModelIds.push(model.id);

    const detail = await getModelBySlug(slug);
    expect(detail?.seoTitle).toBe("Ручной SEO title");
    expect(detail?.seoDescription).toBe("Ручное SEO description");
    expect(detail?.noindex).toBe(true);
    expect(detail?.tags[0]?.seoIndexed).toBe(true);
  });

  it("listPublishedModelSlugs (sitemap) excludes noindex models but includes regular published ones", async () => {
    const indexableSlug = unique("model-indexable");
    const noindexSlug = unique("model-noindex");

    const [indexable, noindexed] = await Promise.all([
      prisma.model.create({
        data: {
          title: "Индексируемая модель",
          slug: indexableSlug,
          description: "Описание",
          price: 5_000,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      }),
      prisma.model.create({
        data: {
          title: "Модель без индексации",
          slug: noindexSlug,
          description: "Описание",
          price: 5_000,
          status: "PUBLISHED",
          publishedAt: new Date(),
          noindex: true,
        },
      }),
    ]);
    createdModelIds.push(indexable.id, noindexed.id);

    const slugs = (await listPublishedModelSlugs()).map((m) => m.slug);
    expect(slugs).toContain(indexableSlug);
    expect(slugs).not.toContain(noindexSlug);
  });

  it("listRelatedModels prefers models sharing a tag, and falls back to other published models to fill the limit", async () => {
    const tag = await prisma.tag.create({
      data: { name: unique("Общий тег"), slug: unique("shared-tag") },
    });
    createdTagIds.push(tag.id);

    const base = await prisma.model.create({
      data: {
        title: "Базовая модель",
        slug: unique("related-base"),
        description: "Описание",
        price: 5_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
        tags: { create: [{ tagId: tag.id }] },
      },
    });
    const related = await prisma.model.create({
      data: {
        title: "Похожая модель",
        slug: unique("related-match"),
        description: "Описание",
        price: 5_000,
        status: "PUBLISHED",
        publishedAt: new Date(),
        tags: { create: [{ tagId: tag.id }] },
      },
    });
    createdModelIds.push(base.id, related.id);

    const results = await listRelatedModels(base.id, [tag.slug], 4);
    expect(results.map((r) => r.id)).toContain(related.id);
    expect(results.map((r) => r.id)).not.toContain(base.id);
  });
});
