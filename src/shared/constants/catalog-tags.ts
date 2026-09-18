/**
 * Canonical catalog tags shown as filter pills (PDF catalog page) and in the
 * footer "Каталог" column. Single source of truth shared by the seed
 * script and any UI that needs to link to a pre-defined tag, so slugs never
 * drift between seed data and links built against it.
 */
export const CATALOG_TAGS = [
  { slug: "organayzery", name: "Органайзеры" },
  { slug: "dekor-i-interer", name: "Декор и интерьер" },
  { slug: "instrumenty", name: "Инструменты" },
  { slug: "avto", name: "Авто" },
  { slug: "poleznye-veshchi", name: "Полезные вещи" },
] as const;

export type CatalogTagSlug = (typeof CATALOG_TAGS)[number]["slug"];
