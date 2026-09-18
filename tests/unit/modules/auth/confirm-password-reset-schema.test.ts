import { describe, expect, it } from "vitest";
import { confirmPasswordResetSchema } from "@modules/auth/domain/confirm-password-reset.schema";

describe("confirmPasswordResetSchema", () => {
  const base = { token: "raw-token-value" };

  it("rejects a password that fails the strength policy", () => {
    const result = confirmPasswordResetSchema.safeParse({
      ...base,
      password: "weakpass",
      passwordConfirm: "weakpass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirmation even when both are individually strong", () => {
    const result = confirmPasswordResetSchema.safeParse({
      ...base,
      password: "Password1",
      passwordConfirm: "Password2",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /Пароли не совпадают/.test(i.message))).toBe(true);
    }
  });

  it("accepts a strong, matching password with a token", () => {
    const result = confirmPasswordResetSchema.safeParse({
      ...base,
      password: "Password1",
      passwordConfirm: "Password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty token", () => {
    const result = confirmPasswordResetSchema.safeParse({
      token: "",
      password: "Password1",
      passwordConfirm: "Password1",
    });
    expect(result.success).toBe(false);
  });
});
