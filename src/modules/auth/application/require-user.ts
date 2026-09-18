import "server-only";
import { AuthenticationError, AuthorizationError } from "@shared/errors";
import type { SessionUser } from "../domain/session-user";
import { getCurrentUser } from "./get-current-user";

/** Throws AuthenticationError (401) when no user is logged in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError("Требуется авторизация");
  }
  return user;
}

/** Throws AuthenticationError (401) / AuthorizationError (403) as appropriate. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AuthorizationError("Недостаточно прав");
  }
  return user;
}
