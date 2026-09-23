import "server-only";
import { NotFoundError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import { tagSeoInputSchema, type TagSeoInput } from "../domain/tag-schema";
import type { TagSeoDetail } from "../domain/tag";
import { updateTagSeoRow } from "../infrastructure/prisma-tag-repository";

/**
 * Admin: opt a tag into (or out of) its own indexable /tag/{slug} page and
 * set its manual SEO copy. Separate from `renameTag` on purpose — see
 * tag-schema.ts's comment on why SEO fields live in their own schema.
 */
export async function updateTagSeo(
  id: string,
  input: TagSeoInput,
  actorId: string,
): Promise<TagSeoDetail> {
  const data = tagSeoInputSchema.parse(input);

  const tag = await updateTagSeoRow(id, {
    seoIndexed: data.seoIndexed,
    seoTitle: data.seoTitle.trim() || null,
    seoH1: data.seoH1.trim() || null,
    seoDescription: data.seoDescription.trim() || null,
  });
  if (!tag) {
    throw new NotFoundError("Категория не найдена");
  }

  await recordAuditEvent({
    event: "tag.updated",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "Tag",
    entityId: tag.id,
    metadata: { seoIndexed: tag.seoIndexed },
  });

  return tag;
}
