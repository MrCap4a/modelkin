import { prisma } from "@infrastructure/database";
import type { TagAdminSummary, TagSummary } from "../domain/tag";

export async function listTagsPublic(): Promise<TagSummary[]> {
  return prisma.tag.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listTagsForAdmin(): Promise<TagAdminSummary[]> {
  const tags = await prisma.tag.findMany({
    select: { id: true, slug: true, name: true, _count: { select: { models: true } } },
    orderBy: { name: "asc" },
  });
  return tags.map((tag) => ({
    id: tag.id,
    slug: tag.slug,
    name: tag.name,
    modelCount: tag._count.models,
  }));
}

export async function tagSlugExists(slug: string): Promise<boolean> {
  const count = await prisma.tag.count({ where: { slug } });
  return count > 0;
}

export async function createTagRow(name: string, slug: string): Promise<TagSummary> {
  return prisma.tag.create({ data: { name, slug }, select: { id: true, slug: true, name: true } });
}

export async function renameTagRow(id: string, name: string): Promise<TagSummary | null> {
  try {
    return await prisma.tag.update({
      where: { id },
      data: { name },
      select: { id: true, slug: true, name: true },
    });
  } catch {
    return null;
  }
}

export async function deleteTagRow(id: string): Promise<boolean> {
  try {
    // ModelTag rows referencing this tag cascade-delete (schema.prisma:
    // ModelTag.tag onDelete: Cascade) — models themselves are untouched,
    // they just lose this one tag association.
    await prisma.tag.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function findTagById(id: string): Promise<TagSummary | null> {
  return prisma.tag.findUnique({ where: { id }, select: { id: true, slug: true, name: true } });
}
