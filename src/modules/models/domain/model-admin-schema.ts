// Pure Zod schema — no "server-only" import, no Prisma — safe for Client
// Components (the admin model form) to import directly from this concrete
// file. NEVER import this from the module's index.ts barrel in a Client
// Component: that barrel also re-exports server-only use cases, and mixing
// the two in a "use client" import graph breaks the production build (see
// the admin agent's task brief / ARCHITECTURE.md for the established
// pattern — @modules/custom-orders/domain/custom-order-schema is the
// reference this mirrors).

import { z } from "zod";
import { CATALOG_TAGS, type CatalogTagSlug } from "@shared/constants/catalog-tags";

const TAG_SLUG_VALUES = CATALOG_TAGS.map((tag) => tag.slug) as [CatalogTagSlug, ...CatalogTagSlug[]];

/**
 * Shared by create + update (admin picks whichever fields it wants to send;
 * `modelAdminUpdateSchema` below relaxes required-ness for partial edits).
 * `price` is always kopecks (ТЗ §13) — the form component is responsible for
 * converting the rubles the admin types into whole kopecks before calling
 * this schema.
 */
export const modelAdminInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Название должно быть не короче 3 символов")
    .max(200, "Название слишком длинное"),
  description: z
    .string()
    .trim()
    .min(10, "Добавьте описание (минимум 10 символов)")
    .max(5000, "Описание слишком длинное"),
  price: z
    .number()
    .int("Цена должна быть целым числом копеек")
    .positive("Цена должна быть больше нуля"),
  tagSlugs: z.array(z.enum(TAG_SLUG_VALUES)).max(10, "Слишком много тегов").default([]),
  authorEmail: z
    .union([z.string().trim().email("Некорректный email автора"), z.literal("")])
    .optional(),
});

export type ModelAdminInput = z.infer<typeof modelAdminInputSchema>;

export const modelAdminUpdateSchema = modelAdminInputSchema.partial();
export type ModelAdminUpdateInput = z.infer<typeof modelAdminUpdateSchema>;
