import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";

const { cookieStore } = vi.hoisted(() => ({ cookieStore: new Map<string, string>() }));

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

const { changePassword } = await import("@modules/auth/application/change-password");
const { hashPassword, verifyPassword } = await import("@modules/auth/infrastructure/password-hash");
const { createSession } = await import("@modules/auth/infrastructure/prisma-session-repository");
const { listAuditLogs } = await import("@modules/audit");

describe("changePassword (integration)", () => {
  beforeEach(() => {
    cookieStore.clear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("invalidates every existing session and issues a fresh one (ТЗ §14)", async () => {
    const email = `change-pw-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword("CurrentPass1"), role: "USER" },
    });

    // Two "devices" logged in before the change.
    await createSession(user.id);
    await createSession(user.id);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(2);

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role as "USER" | "ADMIN",
    };

    await changePassword(
      sessionUser,
      { currentPassword: "CurrentPass1", newPassword: "NewPassword1", newPasswordConfirm: "NewPassword1" },
      { ip: "203.0.113.40" },
    );

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("NewPassword1", updatedUser.passwordHash)).toBe(true);

    // Both old sessions gone, exactly one new one issued.
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
    expect(cookieStore.get("modelkin_session")).toBeTruthy();

    const audit = await listAuditLogs({ event: "auth.password_change", actorUserId: user.id });
    expect(audit.items).toHaveLength(1);
  });

  it("rejects an incorrect current password without touching sessions", async () => {
    const email = `change-pw-wrong-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword("CurrentPass1"), role: "USER" },
    });
    await createSession(user.id);

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role as "USER" | "ADMIN",
    };

    await expect(
      changePassword(sessionUser, {
        currentPassword: "WrongPassword1",
        newPassword: "NewPassword1",
        newPasswordConfirm: "NewPassword1",
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_ERROR" });

    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
  });
});
