import "server-only";
import {
  findUserProfileById,
  type UserProfileRecord,
} from "../infrastructure/prisma-user-profile-repository";

export async function getUserProfile(userId: string): Promise<UserProfileRecord | null> {
  return findUserProfileById(userId);
}
