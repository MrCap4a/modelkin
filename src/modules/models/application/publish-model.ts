import "server-only";
import { prisma } from "@infrastructure/database";
import { recordAuditEvent } from "@modules/audit";
import { NotFoundError, ValidationError } from "@shared/errors";
import type { ModelAdminDetail } from "../domain/model-admin";
import { getModelForAdmin } from "./get-model-for-admin";

/**
 * Admin CRUD — publish (ТЗ §29). Requires at least one preview image and one
 * STL file: a model with no printable file can't actually be sold, and a
 * model with no preview image would show a broken card in the public
 * catalog. `publishedAt` is set once and never overwritten by a
 * hide→publish→hide→publish cycle, so it reflects the model's original
 * publish date.
 */
export async function publishModel(modelId: string, actorId: string): Promise<ModelAdminDetail> {
  const model = await prisma.model.findUnique({
    where: { id: modelId },
    select: {
      id: true,
      publishedAt: true,
      images: { select: { id: true }, take: 1 },
      files: { select: { id: true }, take: 1 },
    },
  });

  if (!model) {
    throw new NotFoundError("Модель не найдена");
  }
  if (model.images.length === 0) {
    throw new ValidationError("Нельзя опубликовать модель без изображения превью");
  }
  if (model.files.length === 0) {
    throw new ValidationError("Нельзя опубликовать модель без STL-файла");
  }

  await prisma.model.update({
    where: { id: modelId },
    data: {
      status: "PUBLISHED",
      publishedAt: model.publishedAt ?? new Date(),
    },
  });

  await recordAuditEvent({
    event: "model.published",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "Model",
    entityId: modelId,
  });

  const detail = await getModelForAdmin(modelId);
  if (!detail) {
    throw new NotFoundError("Модель не найдена после публикации");
  }
  return detail;
}
