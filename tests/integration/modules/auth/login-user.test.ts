import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@infrastructure/database";

vi.mock("server-only", () => ({}));

import { loginUser } from "@modules/auth/application/login-user";
import { hashPassword } from "@modules/auth/infrastructure/password-hash";
import { listAuditLogs } from "@modules/audit";

// loginUser only touches next/headers (setSessionCookie) on the success
// path; the failure paths this file exercises throw before that, so no
// next/headers mock is needed here.

// Randomized — see the same rate-limit note in register-user.test.ts.
const TEST_IP = `203.0.113.${20 + Math.floor(Math.random() * 200)}`;
const email = `login-test-${Date.now()}@example.com`;
const correctPassword = "CorrectHorse1";
let userId: string;

describe("loginUser (integration)", () => {
  beforeAll(async () => {
    const passwordHash = await hashPassword(correctPassword);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: "USER" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a wrong password with the generic message and audit-logs auth.login_failure", async () => {
    await expect(
      loginUser({ email, password: "totally-wrong" }, { ip: TEST_IP }),
    ).rejects.toMatchObject({
      code: "AUTHENTICATION_ERROR",
      message: "Неверный email или пароль",
    });

    const audit = await listAuditLogs({ event: "auth.login_failure", actorUserId: userId });
    expect(audit.items.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects an unknown email with the same generic message, without revealing existence", async () => {
    await expect(
      loginUser({ email: "nobody-such-user@example.com", password: "whatever1" }, { ip: TEST_IP }),
    ).rejects.toMatchObject({
      code: "AUTHENTICATION_ERROR",
      message: "Неверный email или пароль",
    });
  });
});
