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

/**
 * SEO override fields — a separate schema from `tagInputSchema` on purpose:
 * renaming a tag (used everywhere as a filter/classification label) is a
 * distinct, low-risk action from opting a tag into being its own indexable
 * page (see ARCHITECTURE.md — tags stay unrestricted for filtering, only a
 * few are ever `seoIndexed`). Keeping them separate means the common
 * rename/delete flow in the admin UI never has to touch/validate SEO
 * fields it isn't changing.
 */
export const tagSeoInputSchema = z.object({
  seoIndexed: z.boolean(),
  seoTitle: z.union([z.string().trim().max(90, "SEO-заголовок слишком длинный"), z.literal("")]),
  seoH1: z.union([z.string().trim().max(90, "H1 слишком длинный"), z.literal("")]),
  seoDescription: z.union([
    z.string().trim().max(300, "SEO-описание слишком длинное"),
    z.literal(""),
  ]),
});

export type TagSeoInput = z.infer<typeof tagSeoInputSchema>;
