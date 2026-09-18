import { z } from "zod";

export const requestPasswordResetSchema = z.object({
  email: z.string().min(1, "Введите email").email("Некорректный формат email"),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
