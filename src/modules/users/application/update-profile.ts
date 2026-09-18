import "server-only";
import type { SessionUser } from "@modules/auth";
import { updateProfileSchema, type UpdateProfileInput } from "../domain/update-profile.schema";
import { updateUserName } from "../infrastructure/prisma-user-profile-repository";

/** "Личные данные" → "Сохранить изменения" on the profile screen (design.pdf page 9). */
export async function updateProfile(currentUser: SessionUser, input: UpdateProfileInput): Promise<void> {
  const data = updateProfileSchema.parse(input);
  await updateUserName(currentUser.id, data.name);
}
