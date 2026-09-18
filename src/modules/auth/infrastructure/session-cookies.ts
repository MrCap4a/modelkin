import "server-only";
import { cookies } from "next/headers";
import { getConfig } from "@shared/config";

export async function setSessionCookie(rawToken: string, expiresAt: Date): Promise<void> {
  const config = getConfig();
  const store = await cookies();
  store.set(config.session.cookieName, rawToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const config = getConfig();
  const store = await cookies();
  return store.get(config.session.cookieName)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const config = getConfig();
  const store = await cookies();
  store.delete(config.session.cookieName);
}
