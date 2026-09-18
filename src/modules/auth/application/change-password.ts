import "server-only";
import { AuthenticationError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import { changePasswordSchema, type ChangePasswordInput } from "../domain/change-password.schema";
import type { SessionUser } from "../domain/session-user";
import { hashPassword, verifyPassword } from "../infrastructure/password-hash";
import { findUserById, updateUserPasswordHash } from "../infrastructure/prisma-user-repository";
import { deleteAllSessionsForUser, createSession } from "../infrastructure/prisma-session-repository";
import { setSessionCookie } from "../infrastructure/session-cookies";

export interface ChangePasswordContext {
  ip?: string;
}

/**
 * Logged-in "change password" flow from the profile page. Verifies the
 * current password, applies the same strong-password policy as reset, then
 * — same as password reset (ТЗ §14) — invalidates every session including
 * the current one and immediately issues a fresh one so the user isn't
 * logged out by their own action.
 */
export async function changePassword(
  currentUser: SessionUser,
  input: ChangePasswordInput,
  context: ChangePasswordContext = {},
): Promise<void> {
  const data = changePasswordSchema.parse(input);

  const user = await findUserById(currentUser.id);
  if (!user) {
    throw new AuthenticationError("Требуется авторизация");
  }

  const currentPasswordValid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!currentPasswordValid) {
    throw new AuthenticationError("Текущий пароль указан неверно");
  }

  const passwordHash = await hashPassword(data.newPassword);
  await updateUserPasswordHash(user.id, passwordHash);

  await deleteAllSessionsForUser(user.id);
  const { rawToken, expiresAt } = await createSession(user.id);
  await setSessionCookie(rawToken, expiresAt);

  await recordAuditEvent({
    event: "auth.password_change",
    actorUserId: user.id,
    actorRole: user.role,
    entityType: "User",
    entityId: user.id,
    ip: context.ip,
  });
}
