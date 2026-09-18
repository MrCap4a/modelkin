import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";

const { cookieStore, sentEmails } = vi.hoisted(() => ({
  cookieStore: new Map<string, string>(),
  sentEmails: [] as { to: string; subject: string; text: string }[],
}));

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

vi.mock("@infrastructure/email", () => ({
  getEmailProvider: () => ({
    send: async (message: { to: string; subject: string; text: string }) => {
      sentEmails.push(message);
    },
  }),
}));

// Import the specific application files directly rather than the module's
// `index.ts` barrel — the barrel also re-exports `getCurrentUser`, which
// uses React's `cache()` (only available in the canary React build Next.js
// bundles internally), not the plain `react` package resolved under Vitest.
const { requestPasswordReset } = await import("@modules/auth/application/request-password-reset");
const { confirmPasswordReset } = await import("@modules/auth/application/confirm-password-reset");
const { hashPassword, verifyPassword } = await import("@modules/auth/infrastructure/password-hash");
const { createSession } = await import("@modules/auth/infrastructure/prisma-session-repository");
const { listAuditLogs } = await import("@modules/audit");

// Randomized — requestPasswordReset is rate-limited by IP and a fixed
// Postgres-backed bucket would otherwise accumulate across repeated local
// test runs (see the same note in register-user.test.ts).
const TEST_IP = `203.0.113.${30 + Math.floor(Math.random() * 200)}`;

function extractRawToken(emailText: string): string {
  const match = emailText.match(/\/reset-password\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("no reset link found in email body");
  return match[1]!;
}

describe("password reset flow (integration)", () => {
  beforeEach(() => {
    cookieStore.clear();
    sentEmails.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("does not send an email and does not throw for an unknown address (no account-existence leak)", async () => {
    await expect(
      requestPasswordReset({ email: `nobody-${Date.now()}@example.com` }, { ip: TEST_IP }),
    ).resolves.toBeUndefined();
    expect(sentEmails).toHaveLength(0);
  });

  it("runs the full forgot-password -> email link -> reset flow end to end", async () => {
    const email = `reset-flow-${Date.now()}@example.com`;
    const oldPasswordHash = await hashPassword("OldPassword1");
    const user = await prisma.user.create({ data: { email, passwordHash: oldPasswordHash, role: "USER" } });

    // A pre-existing session, e.g. from another device, that must be
    // invalidated once the password is reset (ТЗ §14).
    await createSession(user.id);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);

    await requestPasswordReset({ email }, { ip: TEST_IP });
    expect(sentEmails).toHaveLength(1);
    const rawToken = extractRawToken(sentEmails[0]!.text);

    const sessionUser = await confirmPasswordReset(
      { token: rawToken, password: "NewPassword1", passwordConfirm: "NewPassword1" },
      { ip: TEST_IP },
    );
    expect(sessionUser.id).toBe(user.id);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("NewPassword1", updatedUser.passwordHash)).toBe(true);
    expect(await verifyPassword("OldPassword1", updatedUser.passwordHash)).toBe(false);

    // Old session(s) gone, exactly one fresh session issued by confirmPasswordReset.
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
    expect(cookieStore.get("modelkin_session")).toBeTruthy();

    // Token is single-use: replaying it must fail.
    await expect(
      confirmPasswordReset(
        { token: rawToken, password: "AnotherPass1", passwordConfirm: "AnotherPass1" },
        { ip: TEST_IP },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const audit = await listAuditLogs({ event: "auth.password_reset_completed", actorUserId: user.id });
    expect(audit.items).toHaveLength(1);
  });

  it("rejects an expired token", async () => {
    const email = `reset-expired-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword("OldPassword1"), role: "USER" },
    });

    const { hashToken, generateSecureToken } = await import("@modules/auth/infrastructure/tokens");
    const rawToken = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });

    await expect(
      confirmPasswordReset(
        { token: rawToken, password: "NewPassword1", passwordConfirm: "NewPassword1" },
        { ip: TEST_IP },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
