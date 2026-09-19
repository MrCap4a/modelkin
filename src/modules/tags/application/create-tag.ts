import "server-only";
import { generateUniqueSlug } from "@shared/utils/slugify";
import { recordAuditEvent } from "@modules/audit";
import { tagInputSchema, type TagInput } from "../domain/tag-schema";
import type { TagSummary } from "../domain/tag";
import { createTagRow, tagSlugExists } from "../infrastructure/prisma-tag-repository";

/** Admin: create a new category/tag (item 3 — categories are admin-managed, not hardcoded). */
export async function createTag(input: TagInput, actorId: string): Promise<TagSummary> {
  const data = tagInputSchema.parse(input);
  const slug = await generateUniqueSlug(data.name, tagSlugExists);

  const tag = await createTagRow(data.name, slug);

  await recordAuditEvent({
    event: "tag.created",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "Tag",
    entityId: tag.id,
    metadata: { name: tag.name, slug: tag.slug },
  });

  return tag;
}
