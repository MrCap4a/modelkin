import "server-only";
import { ValidationError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import {
  confirmPasswordResetSchema,
  type ConfirmPasswordResetInput,
} from "../domain/confirm-password-reset.schema";
import type { SessionUser } from "../domain/session-user";
import { hashPassword } from "../infrastructure/password-hash";
import {
  findValidPasswordResetToken,
  consumePasswordResetToken,
} from "../infrastructure/prisma-password-reset-repository";
import { findUserById } from "../infrastructure/prisma-user-repository";
import { deleteAllSessionsForUser, createSession } from "../infrastructure/prisma-session-repository";
import { setSessionCookie } from "../infrastructure/session-cookies";

const INVALID_TOKEN_MESSAGE = "Ссылка для сброса пароля недействительна или истекла";

export interface ConfirmPasswordResetContext {
  ip: string;
}

/**
 * Looks up an unconsumed, unexpired reset token without spending it — used
 * by the reset-password page to decide whether to render the form or an
 * "invalid link" state, and to show which account the link belongs to
 * (design.pdf page 8: "Вы меняете пароль от аккаунта ...").
 */
export async function getPasswordResetTokenPreview(rawToken: string): Promise<{ email: string } | null> {
  const token = await findValidPasswordResetToken(rawToken);
  if (!token) return null;

  const user = await findUserById(token.userId);
  if (!user) return null;

  return { email: user.email };
}

/**
 * ТЗ §14/§15: validates the single-use token, enforces the stronger
 * password policy (design.pdf page 8 checklist), invalidates every existing
 * session for the account, then logs the user in with a fresh session.
 */
export async function confirmPasswordReset(
  input: ConfirmPasswordResetInput,
  context: ConfirmPasswordResetContext,
): Promise<SessionUser> {
  const data = confirmPasswordResetSchema.parse(input);

  const token = await findValidPasswordResetToken(data.token);
  if (!token) {
    throw new ValidationError(INVALID_TOKEN_MESSAGE);
  }

  const passwordHash = await hashPassword(data.password);
  await consumePasswordResetToken({ tokenId: token.id, userId: token.userId, passwordHash });

  await deleteAllSessionsForUser(token.userId);

  const { rawToken, expiresAt } = await createSession(token.userId);
  await setSessionCookie(rawToken, expiresAt);

  await recordAuditEvent({
    event: "auth.password_reset_completed",
    actorUserId: token.userId,
    entityType: "User",
    entityId: token.userId,
    ip: context.ip,
  });

  const user = await findUserById(token.userId);
  if (!user) {
    throw new ValidationError("Пользователь не найден");
  }

  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, role: user.role };
}
