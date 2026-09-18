import { AuthorizationError, NotFoundError } from "@shared/errors";
import { createPresignedDownloadUrl } from "@infrastructure/storage";
import { recordAuditEvent } from "@modules/audit";
import type { SignedDownload } from "../domain/owned-model-summary";
import { countOwnership, findModelFileForDownload } from "../infrastructure/prisma-ownership-repository";

/**
 * Download authorization flow (ТЗ §21 exactly): authenticated request →
 * ownership check → signed URL. Never serves the private STL without a
 * verified `UserModelOwnership` row.
 */
export async function getSignedDownloadUrl(userId: string, modelId: string): Promise<SignedDownload> {
  const owned = (await countOwnership(userId, modelId)) > 0;

  if (!owned) {
    await recordAuditEvent({
      event: "file.download_denied",
      actorUserId: userId,
      entityType: "Model",
      entityId: modelId,
    });
    throw new AuthorizationError("У вас нет доступа к этому файлу — модель не куплена");
  }

  const file = await findModelFileForDownload(modelId);
  if (!file) {
    throw new NotFoundError("Файл модели не найден");
  }

  const { url } = await createPresignedDownloadUrl({
    key: file.storageKey,
    downloadFileName: file.fileName,
  });

  await recordAuditEvent({
    event: "file.download",
    actorUserId: userId,
    entityType: "Model",
    entityId: modelId,
  });

  return { url, fileName: file.fileName };
}
