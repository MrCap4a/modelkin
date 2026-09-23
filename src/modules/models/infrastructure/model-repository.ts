import { prisma } from "@infrastructure/database";
import { getPublicObjectUrl } from "@infrastructure/storage";
import type { ModelDetail } from "../domain/model";

/**
 * Public read side only — always filters by `status: "PUBLISHED"`. A
 * DRAFT/HIDDEN model must be invisible to these queries even if the caller
 * knows its exact slug/id (admin CRUD lives in a different module).
 */
export async function findPublishedModelDetailBySlug(slug: string): Promise<ModelDetail | null> {
  const model = await prisma.model.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      tags: { include: { tag: true } },
      files: { select: { id: true }, take: 1 },
      author: { select: { name: true } },
    },
  });

  if (!model) return null;

  return {
    id: model.id,
    slug: model.slug,
    title: model.title,
    description: model.description,
    price: model.price,
    images: model.images.map((image) => ({
      id: image.id,
      url: getPublicObjectUrl(image.storageKey),
      alt: image.alt,
      sortOrder: image.sortOrder,
    })),
    tags: model.tags.map((modelTag) => ({
      slug: modelTag.tag.slug,
      name: modelTag.tag.name,
      seoIndexed: modelTag.tag.seoIndexed,
    })),
    author: model.author?.name ? { name: model.author.name } : null,
    hasViewerModel: model.files.length > 0,
    publishedAt: model.publishedAt,
    updatedAt: model.updatedAt,
    seoTitle: model.seoTitle,
    seoDescription: model.seoDescription,
    noindex: model.noindex,
  };
}

export async function findPublishedModelIdBySlug(slug: string): Promise<string | null> {
  const model = await prisma.model.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });
  return model?.id ?? null;
}

/**
 * Returns the storage key of the model's first STL file — server-side only,
 * never returned directly to the client. The caller (get-model-viewer-source)
 * turns it into a short-lived signed GET URL.
 */
export async function getFirstModelFileStorageKey(modelId: string): Promise<string | null> {
  const file = await prisma.modelFile.findFirst({
    where: { modelId },
    orderBy: { createdAt: "asc" },
    select: { storageKey: true },
  });
  return file?.storageKey ?? null;
}

export async function listPublishedModelSlugsForSitemap(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  // noindex: true is a manual per-model opt-out (see Model.noindex) — a
  // noindexed page has no business being advertised in the sitemap.
  return prisma.model.findMany({
    where: { status: "PUBLISHED", noindex: false },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });
}
