import { randomBytes, createHash } from "node:crypto";

/** Opaque, URL-safe random token — this is the raw value sent to the client. */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * We only ever persist the hash of a session/reset token (ТЗ §14, §15: "не
 * должны храниться в открытом виде"). Lookups hash the incoming cookie/URL
 * token and compare against this column — a stolen DB dump alone can't be
 * replayed as a live session/reset token.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
