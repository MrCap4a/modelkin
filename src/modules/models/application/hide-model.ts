import "server-only";
import { prisma } from "@infrastructure/database";
import { recordAuditEvent } from "@modules/audit";
import { NotFoundError } from "@shared/errors";
import type { ModelAdminDetail } from "../domain/model-admin";
import { getModelForAdmin } from "./get-model-for-admin";

/**
 * Admin CRUD — hide (ТЗ §29). This is the soft-delete mechanism for models
 * (ТЗ §29 lists create/read/update/publish/hide, not delete, as the
 * required admin CRUD set) — a HIDDEN model disappears from the public
 * catalog/model page (see @modules/models' public read side, which filters
 * strictly on `status: "PUBLISHED"`) but existing owners keep their
 * downloads (ownership checks don't look at Model.status).
 */
export async function hideModel(modelId: string, actorId: string): Promise<ModelAdminDetail> {
  const existing = await prisma.model.findUnique({ where: { id: modelId }, select: { id: true } });
  if (!existing) {
    throw new NotFoundError("Модель не найдена");
  }

  await prisma.model.update({ where: { id: modelId }, data: { status: "HIDDEN" } });

  await recordAuditEvent({
    event: "model.hidden",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "Model",
    entityId: modelId,
  });

  const detail = await getModelForAdmin(modelId);
  if (!detail) {
    throw new NotFoundError("Модель не найдена после скрытия");
  }
  return detail;
}
