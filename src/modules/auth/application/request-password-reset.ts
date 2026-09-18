import "server-only";
import { getConfig } from "@shared/config";
import { getEmailProvider } from "@infrastructure/email";
import { recordAuditEvent } from "@modules/audit";
import { enforceRateLimit, RATE_LIMIT_PRESETS } from "@infrastructure/rate-limit";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "../domain/request-password-reset.schema";
import { findUserByEmail } from "../infrastructure/prisma-user-repository";
import { createPasswordResetToken } from "../infrastructure/prisma-password-reset-repository";

export interface RequestPasswordResetContext {
  ip: string;
}

/**
 * ТЗ §15 / design.pdf page 7. Always completes "successfully" from the
 * caller's point of view whether or not the email exists (SECURITY.md: never
 * reveal account existence) — an email is only actually sent when a
 * matching user is found.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  context: RequestPasswordResetContext,
): Promise<void> {
  await enforceRateLimit({
    key: `password-reset:ip:${context.ip}`,
    ...RATE_LIMIT_PRESETS.passwordReset,
  });

  const data = requestPasswordResetSchema.parse(input);
  const email = data.email.toLowerCase();

  const user = await findUserByEmail(email);
  if (!user) {
    return;
  }

  const { rawToken } = await createPasswordResetToken(user.id);
  const resetUrl = `${getConfig().appUrl}/reset-password/${rawToken}`;

  await getEmailProvider().send({
    to: user.email,
    subject: "Восстановление пароля — Моделкин",
    text: `Чтобы сбросить пароль, перейдите по ссылке: ${resetUrl}\n\nСсылка действительна 1 час. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.`,
    html: `<p>Чтобы сбросить пароль, перейдите по ссылке:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.</p>`,
  });

  await recordAuditEvent({
    event: "auth.password_reset_requested",
    actorUserId: user.id,
    entityType: "User",
    entityId: user.id,
    ip: context.ip,
  });
}
