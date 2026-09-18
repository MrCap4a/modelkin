// Public contract of the auth module. Other modules should only ever import
// from here, never reach into `application/*` or `infrastructure/*` directly.

export { getCurrentUser } from "./application/get-current-user";
export { requireUser, requireAdmin } from "./application/require-user";
export type { SessionUser, UserRole } from "./domain/session-user";

// Session primitives — used by this module's own login/register/logout use
// cases (Agent 1) and by the password-reset flow.
export {
  createSession,
  findSessionUserByRawToken,
  deleteSessionByRawToken,
  deleteAllSessionsForUser,
  deleteExpiredSessions,
} from "./infrastructure/prisma-session-repository";
export {
  setSessionCookie,
  getSessionCookie,
  clearSessionCookie,
} from "./infrastructure/session-cookies";
export { hashPassword, verifyPassword } from "./infrastructure/password-hash";
export { generateSecureToken, hashToken } from "./infrastructure/tokens";
