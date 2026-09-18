import "server-only";
import { prisma } from "@infrastructure/database";
import { getPublicObjectUrl } from "@infrastructure/storage";
import { recordAuditEvent } from "@modules/audit";
import { NotFoundError } from "@shared/errors";

export interface AddModelImageResult {
  id: string;
  url: string;
}

/**
 * Persists the DB row for a preview image the browser has already PUT
 * directly to S3 via @modules/files' requestUploadUrl({ prefix: "previews" })
 * (ТЗ §20 — the file itself never passes through this server).
 *
 * The admin edit screen shows a single "Основное изображение превью" slot
 * (design.pdf "Добавить 3D-модель" mockup — "Заменить картинку"), so this
 * replaces any existing image(s) rather than accumulating a gallery; the
 * underlying schema (`ModelImage`) supports many images per model, so a
 * future gallery UI can call this repeatedly with different `sortOrder`
 * without a data-model change.
 */
export async function addModelImage(
  modelId: string,
  storageKey: string,
  actorId: string,
  options?: { sortOrder?: number; alt?: string },
): Promise<AddModelImageResult> {
  const model = await prisma.model.findUnique({ where: { id: modelId }, select: { id: true } });
  if (!model) {
    throw new NotFoundError("Модель не найдена");
  }

  const image = await prisma.$transaction(async (tx) => {
    await tx.modelImage.deleteMany({ where: { modelId } });
    return tx.modelImage.create({
      data: {
        modelId,
        storageKey,
        sortOrder: options?.sortOrder ?? 0,
        alt: options?.alt,
      },
    });
  });

  await recordAuditEvent({
    event: "file.upload",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "ModelImage",
    entityId: image.id,
    metadata: { modelId, storageKey },
  });

  return { id: image.id, url: getPublicObjectUrl(storageKey) };
}
