import { prisma } from "@infrastructure/database";
import type { UserRole } from "@modules/auth";

export interface UserProfileRecord {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
}

export async function findUserProfileById(userId: string): Promise<UserProfileRecord | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true },
  });
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { name } });
}

export async function updateUserAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
}
