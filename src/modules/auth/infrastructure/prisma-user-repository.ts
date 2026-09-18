import { prisma } from "@infrastructure/database";
import type { UserRole } from "../domain/session-user";

/**
 * Auth's own view of a User row — includes `passwordHash`, unlike
 * `SessionUser` (which is what's exposed outward through the module's
 * public contract). Kept private to this module's infrastructure/application
 * layers.
 */
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name?: string | null;
}): Promise<UserRecord> {
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name ?? null,
      role: "USER",
    },
  });
}

export async function updateUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
