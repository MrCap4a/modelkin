/**
 * Initial seed data only (used by prisma/seed.ts to bootstrap a fresh
 * database with demo categories) — NOT the runtime source of truth.
 * Categories are admin-managed at runtime via @modules/tags (see
 * /admin/tags); the app reads them from the `Tag` table, never from this
 * constant. Editing this file has no effect on an already-seeded database.
 */
export const CATALOG_TAGS = [
  { slug: "organayzery", name: "Органайзеры" },
  { slug: "dekor-i-interer", name: "Декор и интерьер" },
  { slug: "instrumenty", name: "Инструменты" },
  { slug: "avto", name: "Авто" },
  { slug: "poleznye-veshchi", name: "Полезные вещи" },
] as const;

export type CatalogTagSlug = (typeof CATALOG_TAGS)[number]["slug"];
