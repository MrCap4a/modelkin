// Pure Zod schema — no server-only imports — safe for Client Components to
// import directly (never via the module's index.ts barrel, see
// @modules/custom-orders/domain/custom-order-schema for why).
import { z } from "zod";

export const tagInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Название категории должно быть не короче 2 символов")
    .max(60, "Название слишком длинное"),
});

export type TagInput = z.infer<typeof tagInputSchema>;
