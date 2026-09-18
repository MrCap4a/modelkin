import { z } from "zod";
import { strongPasswordSchema } from "./password-policy";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: strongPasswordSchema,
    newPasswordConfirm: z.string().min(1, "Повторите пароль"),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "Пароли не совпадают",
    path: ["newPasswordConfirm"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
