import { describe, expect, it } from "vitest";
import { registerSchema } from "@modules/auth/domain/register.schema";

describe("registerSchema", () => {
  it("rejects an invalid email format with the PDF's copy", () => {
    const result = registerSchema.safeParse({
      email: "alex3dprint",
      password: "12345678",
      passwordConfirm: "12345678",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /Некорректный формат email/.test(i.message))).toBe(
        true,
      );
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "alex@mail.ru",
      password: "12345",
      passwordConfirm: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /минимум 8 символов/.test(i.message))).toBe(true);
    }
  });

  it("rejects mismatched password confirmation", () => {
    const result = registerSchema.safeParse({
      email: "alex@mail.ru",
      password: "12345678",
      passwordConfirm: "12345679",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /Пароли не совпадают/.test(i.message))).toBe(true);
    }
  });

  it("accepts a valid payload", () => {
    const result = registerSchema.safeParse({
      email: "alex@mail.ru",
      password: "12345678",
      passwordConfirm: "12345678",
    });
    expect(result.success).toBe(true);
  });
});
