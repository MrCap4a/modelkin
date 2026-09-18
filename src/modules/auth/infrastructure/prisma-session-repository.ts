import { prisma } from "@infrastructure/database";
import { getConfig } from "@shared/config";
import type { SessionUser } from "../domain/session-user";
import { generateSecureToken, hashToken } from "./tokens";

export async function createSession(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateSecureToken();
  const expiresAt = new Date(Date.now() + getConfig().session.durationMs);

  await prisma.session.create({
    data: { userId, tokenHash: hashToken(rawToken), expiresAt },
  });

  return { rawToken, expiresAt };
}

export async function findSessionUserByRawToken(rawToken: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    avatarUrl: session.user.avatarUrl,
    role: session.user.role,
  };
}

export async function deleteSessionByRawToken(rawToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
}

/** Used on password change/reset to kill every other active session (ТЗ §14). */
export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function deleteExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}
