import "server-only";
import { cache } from "react";
import type { SessionUser } from "../domain/session-user";
import { getSessionCookie } from "../infrastructure/session-cookies";
import { findSessionUserByRawToken } from "../infrastructure/prisma-session-repository";

/**
 * Reads the current visitor's session, if any. `React.cache` de-dupes
 * repeated calls within a single request/render pass (many server
 * components across the tree call this independently), not across
 * requests.
 *
 * This is the primary integration point every other module should use to
 * find out "who is logged in" — see requireUser / requireAdmin below for
 * the common guard variants.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const rawToken = await getSessionCookie();
  if (!rawToken) return null;
  return findSessionUserByRawToken(rawToken);
});
