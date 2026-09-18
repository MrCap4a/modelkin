import "server-only";
import { prisma } from "@infrastructure/database";
import { recordAuditEvent } from "@modules/audit";
import { NotFoundError } from "@shared/errors";

export interface AddModelFileResult {
  id: string;
}

/**
 * Persists the DB row for an STL file the browser has already PUT directly
 * to S3 via @modules/files' requestUploadUrl({ prefix: "models" }) (ТЗ §20).
 *
 * The admin edit screen shows a single "STL файл модели" slot, so this
 * replaces any existing file(s) rather than accumulating multiple STL
 * variants per model — mirrors addModelImage's replace semantics.
 */
export async function addModelFile(
  modelId: string,
  storageKey: string,
  originalName: string,
  mimeType: string,
  size: number,
  actorId: string,
): Promise<AddModelFileResult> {
  const model = await prisma.model.findUnique({ where: { id: modelId }, select: { id: true } });
  if (!model) {
    throw new NotFoundError("Модель не найдена");
  }

  const file = await prisma.$transaction(async (tx) => {
    await tx.modelFile.deleteMany({ where: { modelId } });
    return tx.modelFile.create({
      data: { modelId, storageKey, originalName, mimeType, size },
    });
  });

  await recordAuditEvent({
    event: "file.upload",
    actorUserId: actorId,
    actorRole: "ADMIN",
    entityType: "ModelFile",
    entityId: file.id,
    metadata: { modelId, storageKey, originalName },
  });

  return { id: file.id };
}
