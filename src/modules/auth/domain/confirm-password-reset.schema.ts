import { z } from "zod";
import { strongPasswordSchema } from "./password-policy";

export const confirmPasswordResetSchema = z
  .object({
    token: z.string().min(1, "Ссылка недействительна"),
    password: strongPasswordSchema,
    passwordConfirm: z.string().min(1, "Повторите пароль"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
