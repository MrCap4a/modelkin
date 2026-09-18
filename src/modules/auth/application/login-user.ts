import "server-only";
import { AuthenticationError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import { enforceRateLimit, RATE_LIMIT_PRESETS } from "@infrastructure/rate-limit";
import { loginSchema, type LoginInput } from "../domain/login.schema";
import type { SessionUser } from "../domain/session-user";
import { verifyPassword } from "../infrastructure/password-hash";
import { findUserByEmail } from "../infrastructure/prisma-user-repository";
import { createSession } from "../infrastructure/prisma-session-repository";
import { setSessionCookie } from "../infrastructure/session-cookies";

/** Same message regardless of which field was wrong — never reveals whether the email exists. */
const INVALID_CREDENTIALS_MESSAGE = "Неверный email или пароль";

export interface LoginUserContext {
  ip: string;
}

export async function loginUser(input: LoginInput, context: LoginUserContext): Promise<SessionUser> {
  await enforceRateLimit({ key: `login:ip:${context.ip}`, ...RATE_LIMIT_PRESETS.login });

  const data = loginSchema.parse(input);
  const email = data.email.toLowerCase();

  const user = await findUserByEmail(email);
  if (!user) {
    await recordAuditEvent({ event: "auth.login_failure", ip: context.ip, metadata: { email } });
    throw new AuthenticationError(INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordValid = await verifyPassword(data.password, user.passwordHash);
  if (!passwordValid) {
    await recordAuditEvent({
      event: "auth.login_failure",
      actorUserId: user.id,
      ip: context.ip,
      metadata: { email },
    });
    throw new AuthenticationError(INVALID_CREDENTIALS_MESSAGE);
  }

  const { rawToken, expiresAt } = await createSession(user.id);
  await setSessionCookie(rawToken, expiresAt);

  await recordAuditEvent({
    event: "auth.login_success",
    actorUserId: user.id,
    actorRole: user.role,
    ip: context.ip,
  });

  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, role: user.role };
}
