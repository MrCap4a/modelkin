import { prisma } from "@infrastructure/database";
import { getPublicObjectUrl } from "@infrastructure/storage";
import type { OwnedModelSummary } from "../domain/owned-model-summary";

export async function countOwnership(userId: string, modelId: string): Promise<number> {
  return prisma.userModelOwnership.count({ where: { userId, modelId } });
}

export async function listOwnershipsWithModel(userId: string): Promise<OwnedModelSummary[]> {
  const ownerships = await prisma.userModelOwnership.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      model: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          files: { orderBy: { createdAt: "asc" }, take: 1 },
        },
      },
    },
  });

  return ownerships.map((ownership) => {
    const { model } = ownership;
    const firstImage = model.images[0];
    const firstFile = model.files[0];

    return {
      modelId: model.id,
      title: model.title,
      slug: model.slug,
      previewImageUrl: firstImage ? getPublicObjectUrl(firstImage.storageKey) : null,
      fileSizeBytes: firstFile?.size ?? 0,
      purchasedAt: ownership.createdAt,
    };
  });
}

export async function findModelFileForDownload(
  modelId: string,
): Promise<{ storageKey: string; fileName: string } | null> {
  const model = await prisma.model.findUnique({
    where: { id: modelId },
    include: { files: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const file = model?.files[0];
  if (!model || !file) return null;

  return { storageKey: file.storageKey, fileName: file.originalName || `${model.title}.stl` };
}
