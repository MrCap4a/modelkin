import { z } from "zod";

/**
 * Pure domain rule — no server-only / Next.js imports — so it is safe to
 * import from both server use cases and Client Components (real-time
 * checklist UI on the reset-password screen, design.pdf page 8).
 */
export interface PasswordRequirement {
  id: "minLength" | "uppercase" | "digit";
  label: string;
  test: (password: string) => boolean;
}

/** Matches the checklist copy shown on the reset-password screen (design.pdf, page 8). */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: "minLength", label: "Минимум 8 символов", test: (password) => password.length >= 8 },
  {
    id: "uppercase",
    label: "Хотя бы одна заглавная буква (A-Z)",
    test: (password) => /[A-Z]/.test(password),
  },
  { id: "digit", label: "Хотя бы одна цифра (0-9)", test: (password) => /[0-9]/.test(password) },
];

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password));
}

/**
 * Stronger password rule used by password reset / password change (critical,
 * account-recovery-adjacent flows) — registration only requires the basic
 * 8-character minimum shown on the register screen (design.pdf, page 6).
 */
export const strongPasswordSchema = z
  .string()
  .min(1, "Введите пароль")
  .superRefine((value, ctx) => {
    const failed = PASSWORD_REQUIREMENTS.find((requirement) => !requirement.test(value));
    if (failed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Пароль не соответствует требованиям: ${failed.label.toLowerCase()}`,
      });
    }
  });
