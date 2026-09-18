import "server-only";
import { getConfig } from "@shared/config";
import { getPublicObjectUrl } from "@infrastructure/storage";
import { ValidationError } from "@shared/errors";
import type { SessionUser } from "@modules/auth";
import { updateAvatarSchema, type UpdateAvatarInput } from "../domain/update-avatar.schema";
import { updateUserAvatarUrl } from "../infrastructure/prisma-user-profile-repository";

/**
 * "Сменить фото" on the profile screen (design.pdf page 9). The file itself
 * was already uploaded client-side to the presigned URL obtained from
 * `@modules/files`' `requestUploadUrl({ prefix: "avatars", ... })` — this
 * use case only records the resulting storage key as the user's avatar.
 */
export async function updateAvatar(currentUser: SessionUser, input: UpdateAvatarInput): Promise<string> {
  const data = updateAvatarSchema.parse(input);

  const avatarsPrefix = getConfig().storage.storagePrefixes.avatars;
  if (!data.storageKey.startsWith(avatarsPrefix)) {
    throw new ValidationError("Некорректный ключ файла аватара");
  }

  const avatarUrl = getPublicObjectUrl(data.storageKey);
  await updateUserAvatarUrl(currentUser.id, avatarUrl);
  return avatarUrl;
}
