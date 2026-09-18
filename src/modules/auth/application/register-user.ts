import "server-only";
import { ConflictError } from "@shared/errors";
import { recordAuditEvent } from "@modules/audit";
import { enforceRateLimit, RATE_LIMIT_PRESETS } from "@infrastructure/rate-limit";
import { registerSchema, type RegisterInput } from "../domain/register.schema";
import type { SessionUser } from "../domain/session-user";
import { hashPassword } from "../infrastructure/password-hash";
import { createUser, findUserByEmail } from "../infrastructure/prisma-user-repository";
import { createSession } from "../infrastructure/prisma-session-repository";
import { setSessionCookie } from "../infrastructure/session-cookies";

export interface RegisterUserContext {
  ip: string;
}

/**
 * ТЗ §14 / design.pdf page 6. Creates a USER-role account, starts a session
 * and sets the session cookie. Duplicate email is rejected with
 * ConflictError (409) — the register screen shows this as a form error.
 */
export async function registerUser(
  input: RegisterInput,
  context: RegisterUserContext,
): Promise<SessionUser> {
  await enforceRateLimit({ key: `register:ip:${context.ip}`, ...RATE_LIMIT_PRESETS.register });

  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ConflictError("Пользователь с таким email уже зарегистрирован");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await createUser({ email, passwordHash, name: data.name });

  const { rawToken, expiresAt } = await createSession(user.id);
  await setSessionCookie(rawToken, expiresAt);

  await recordAuditEvent({
    event: "auth.register",
    actorUserId: user.id,
    actorRole: user.role,
    entityType: "User",
    entityId: user.id,
    ip: context.ip,
  });

  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, role: user.role };
}
