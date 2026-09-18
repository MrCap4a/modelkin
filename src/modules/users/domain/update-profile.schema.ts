import { z } from "zod";

/** Pure Zod schema — no server-only imports, safe for Client Component reuse (ТЗ §63). */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Введите имя")
    .max(120, "Слишком длинное имя"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
