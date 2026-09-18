import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";

// registerUser sets an HttpOnly session cookie via next/headers, which only
// works inside a real Next.js request scope. We fake just enough of the
// cookies() API here so the use case can run end-to-end against the real
// Postgres test DB while still exercising its cookie-writing side effect.
const { cookieStore } = vi.hoisted(() => ({ cookieStore: new Map<string, string>() }));

// `server-only` throws when required outside Next's own "react-server"
// resolve condition — which Vitest doesn't provide. Stub it to a no-op so
// use cases marked `import "server-only"` are importable under test.
vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined),
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

const { registerUser } = await import("@modules/auth/application/register-user");
const { listAuditLogs } = await import("@modules/audit");

// Randomized per test run (not a fixed constant) — registerUser is
// rate-limited by IP (RATE_LIMIT_PRESETS.register), and a fixed-window
// Postgres-backed bucket would otherwise accumulate across repeated local
// test runs within the same window and start failing with RATE_LIMITED.
const TEST_IP = `203.0.113.${10 + Math.floor(Math.random() * 200)}`;

function uniqueEmail(): string {
  return `register-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe("registerUser (integration)", () => {
  beforeEach(() => {
    cookieStore.clear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a USER-role account, a session, sets the cookie, and audit-logs auth.register", async () => {
    const email = uniqueEmail();

    const sessionUser = await registerUser(
      { email, password: "12345678", passwordConfirm: "12345678" },
      { ip: TEST_IP },
    );

    expect(sessionUser.email).toBe(email.toLowerCase());
    expect(sessionUser.role).toBe("USER");

    const dbUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.role).toBe("USER");
    expect(dbUser?.passwordHash).not.toBe("12345678");

    const sessions = await prisma.session.findMany({ where: { userId: dbUser!.id } });
    expect(sessions).toHaveLength(1);

    expect(cookieStore.get("modelkin_session")).toBeTruthy();

    const audit = await listAuditLogs({ event: "auth.register", actorUserId: dbUser!.id });
    expect(audit.items).toHaveLength(1);
    expect(audit.items[0]?.ip).toBe(TEST_IP);
  });

  it("rejects a duplicate email with ConflictError and does not create a second user", async () => {
    const email = uniqueEmail();

    await registerUser(
      { email, password: "12345678", passwordConfirm: "12345678" },
      { ip: TEST_IP },
    );

    await expect(
      registerUser(
        { email, password: "87654321", passwordConfirm: "87654321" },
        { ip: TEST_IP },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const users = await prisma.user.findMany({ where: { email: email.toLowerCase() } });
    expect(users).toHaveLength(1);
  });
});
