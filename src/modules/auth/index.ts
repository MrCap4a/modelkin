// Public contract of the auth module. Other modules should only ever import
// from here, never reach into `application/*` or `infrastructure/*` directly.

export { getCurrentUser } from "./application/get-current-user";
export { requireUser, requireAdmin } from "./application/require-user";
export type { SessionUser, UserRole } from "./domain/session-user";

// Use cases (registration, login/logout, password reset/change).
export { registerUser, type RegisterUserContext } from "./application/register-user";
export { loginUser, type LoginUserContext } from "./application/login-user";
export { logoutUser, type LogoutUserContext } from "./application/logout-user";
export {
  requestPasswordReset,
  type RequestPasswordResetContext,
} from "./application/request-password-reset";
export {
  confirmPasswordReset,
  getPasswordResetTokenPreview,
  type ConfirmPasswordResetContext,
} from "./application/confirm-password-reset";
export { changePassword, type ChangePasswordContext } from "./application/change-password";

// Pure Zod schemas — safe to import from Client Components too (ТЗ §63).
export { registerSchema, type RegisterInput } from "./domain/register.schema";
export { loginSchema, type LoginInput } from "./domain/login.schema";
export {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "./domain/request-password-reset.schema";
export {
  confirmPasswordResetSchema,
  type ConfirmPasswordResetInput,
} from "./domain/confirm-password-reset.schema";
export { changePasswordSchema, type ChangePasswordInput } from "./domain/change-password.schema";
export { PASSWORD_REQUIREMENTS, isPasswordStrong } from "./domain/password-policy";

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
export { getClientIp } from "./infrastructure/get-client-ip";
