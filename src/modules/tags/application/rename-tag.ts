import "server-only";
import { NotFoundError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import { tagInputSchema, type TagInput } from "../domain/tag-schema";
import type { TagSummary } from "../domain/tag";
import { renameTagRow } from "../infrastructure/prisma-tag-repository";

/**
 * Admin: rename a category. The slug is intentionally never regenerated
 * (same principle as model slugs, see create-model.ts) — /models?tag=<slug>
 * links stay stable even after the display name changes.
 */
export async function renameTag(id: string, input: TagInput, actorId: string): Promise<TagSummary> {
  const data = tagInputSchema.parse(input);

  const tag = await renameTagRow(id, data.name);
  if (!tag) {
    throw new NotFoundError("Категория не найдена");
  }

  await recordAuditEvent({
    event: "tag.updated",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "Tag",
    entityId: tag.id,
    metadata: { name: tag.name },
  });

  return tag;
}
