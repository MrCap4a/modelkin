import "server-only";
import { recordAuditEvent } from "@modules/audit";
import { getCurrentUser } from "./get-current-user";
import { getSessionCookie, clearSessionCookie } from "../infrastructure/session-cookies";
import { deleteSessionByRawToken } from "../infrastructure/prisma-session-repository";

export interface LogoutUserContext {
  ip?: string;
}

/** Deletes only the current session (not every session — that's password change's job) and clears the cookie. */
export async function logoutUser(context: LogoutUserContext = {}): Promise<void> {
  const user = await getCurrentUser();
  const rawToken = await getSessionCookie();

  if (rawToken) {
    await deleteSessionByRawToken(rawToken);
  }
  await clearSessionCookie();

  if (user) {
    await recordAuditEvent({
      event: "auth.logout",
      actorUserId: user.id,
      actorRole: user.role,
      ip: context.ip,
    });
  }
}
