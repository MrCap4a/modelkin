import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@infrastructure/database";
import { getPublicObjectUrl } from "@infrastructure/storage";
import type {
  ModelAdminDetail,
  ModelAdminStatus,
  ModelAdminSummary,
} from "../domain/model-admin";

/**
 * Admin read/write-side repository — unlike infrastructure/model-repository.ts
 * (public, PUBLISHED-only), every query here is unfiltered by status: an
 * admin must be able to see/edit DRAFT and HIDDEN models too (ТЗ §29).
 */

export async function findModelDetailForAdmin(modelId: string): Promise<ModelAdminDetail | null> {
  const model = await prisma.model.findUnique({
    where: { id: modelId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      files: { orderBy: { createdAt: "asc" } },
      tags: { include: { tag: true } },
      author: { select: { id: true, email: true, name: true } },
    },
  });

  if (!model) return null;

  return {
    id: model.id,
    slug: model.slug,
    title: model.title,
    description: model.description,
    price: model.price,
    status: model.status,
    tags: model.tags.map((modelTag) => ({ slug: modelTag.tag.slug, name: modelTag.tag.name })),
    images: model.images.map((image) => ({
      id: image.id,
      url: getPublicObjectUrl(image.storageKey),
      storageKey: image.storageKey,
      sortOrder: image.sortOrder,
      alt: image.alt,
    })),
    files: model.files.map((file) => ({
      id: file.id,
      storageKey: file.storageKey,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt,
    })),
    author: model.author,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    publishedAt: model.publishedAt,
  };
}

export async function listModelsForAdminRepo(filter: {
  status?: ModelAdminStatus;
  query?: string;
}): Promise<ModelAdminSummary[]> {
  const where: Prisma.ModelWhereInput = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.query ? { title: { contains: filter.query, mode: "insensitive" } } : {}),
  };

  const rows = await prisma.model.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      tags: { include: { tag: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    status: row.status,
    previewImageUrl: row.images[0] ? getPublicObjectUrl(row.images[0].storageKey) : null,
    tags: row.tags.map((modelTag) => ({ slug: modelTag.tag.slug, name: modelTag.tag.name })),
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  }));
}

export async function modelSlugExists(slug: string): Promise<boolean> {
  const existing = await prisma.model.findUnique({ where: { slug }, select: { id: true } });
  return existing !== null;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function findTagIdsBySlugs(slugs: string[]): Promise<{ id: string; slug: string }[]> {
  if (slugs.length === 0) return [];
  return prisma.tag.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
}
