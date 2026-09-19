import "server-only";
import { NotFoundError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import { deleteTagRow, findTagById } from "../infrastructure/prisma-tag-repository";

/**
 * Admin: delete a category. Models that used it simply lose that one tag
 * (ModelTag cascade-deletes, schema.prisma) — they aren't deleted or
 * unpublished. The admin UI shows the usage count beforehand so this isn't
 * a surprise.
 */
export async function deleteTag(id: string, actorId: string): Promise<void> {
  const tag = await findTagById(id);
  if (!tag) {
    throw new NotFoundError("Категория не найдена");
  }

  const ok = await deleteTagRow(id);
  if (!ok) {
    throw new NotFoundError("Категория не найдена");
  }

  await recordAuditEvent({
    event: "tag.deleted",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "Tag",
    entityId: id,
    metadata: { name: tag.name, slug: tag.slug },
  });
}
