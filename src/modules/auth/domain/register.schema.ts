import { z } from "zod";

/**
 * Pure Zod schema (ТЗ §63: reusable schemas) — safe to import from Client
 * Components for real-time validation as well as from the server use case.
 * Messages match the inline validation states on design.pdf page 6.
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "Введите email")
      .email("Некорректный формат email. Пример: name@mail.ru"),
    password: z.string().min(8, "Пароль слишком короткий (минимум 8 символов)"),
    passwordConfirm: z.string().min(1, "Повторите пароль"),
    name: z.string().trim().max(120, "Слишком длинное имя").optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
