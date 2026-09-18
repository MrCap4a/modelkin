import { describe, expect, it } from "vitest";
import {
  PASSWORD_REQUIREMENTS,
  isPasswordStrong,
  strongPasswordSchema,
} from "@modules/auth/domain/password-policy";

describe("PASSWORD_REQUIREMENTS", () => {
  it("matches the reset-password checklist copy (design.pdf page 8)", () => {
    expect(PASSWORD_REQUIREMENTS.map((r) => r.label)).toEqual([
      "Минимум 8 символов",
      "Хотя бы одна заглавная буква (A-Z)",
      "Хотя бы одна цифра (0-9)",
    ]);
  });
});

describe("isPasswordStrong", () => {
  it("rejects a password missing an uppercase letter", () => {
    expect(isPasswordStrong("password1")).toBe(false);
  });

  it("rejects a password missing a digit", () => {
    expect(isPasswordStrong("Password")).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(isPasswordStrong("Pass1")).toBe(false);
  });

  it("accepts a password satisfying every requirement", () => {
    expect(isPasswordStrong("Password1")).toBe(true);
  });
});

describe("strongPasswordSchema", () => {
  it("rejects a weak password with a specific message", () => {
    const result = strongPasswordSchema.safeParse("weak");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/минимум 8 символов/i);
    }
  });

  it("accepts a strong password", () => {
    expect(strongPasswordSchema.safeParse("Password1").success).toBe(true);
  });
});
