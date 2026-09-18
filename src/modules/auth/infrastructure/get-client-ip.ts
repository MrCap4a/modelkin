import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate-limit bucket keys (ТЗ §44: key by IP).
 * Trusts `X-Forwarded-For` set by the reverse proxy in front of the app
 * (see DEPLOYMENT.md) — falls back to `X-Real-IP`, then a constant bucket
 * shared by all unidentifiable clients rather than skipping rate limiting.
 */
export async function getClientIp(): Promise<string> {
  const store = await headers();
  const forwardedFor = store.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return store.get("x-real-ip") ?? "unknown";
}
