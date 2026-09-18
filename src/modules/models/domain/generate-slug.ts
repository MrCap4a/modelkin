/**
 * Slug generation for admin-created models (ТЗ §29 — admin manages `slug`
 * indirectly by naming a model; we derive it rather than asking the admin to
 * type a URL-safe string by hand). Pure/no I/O — safe to unit test directly.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Transliterates Cyrillic characters to Latin; non-Cyrillic characters pass through unchanged. */
export function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

const FALLBACK_SLUG_BASE = "model";
const MAX_SLUG_BASE_LENGTH = 80;

/** Lowercase, hyphenated, URL-safe base slug from an arbitrary (possibly Cyrillic) title. */
export function slugify(title: string): string {
  const transliterated = transliterate(title.trim());
  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_BASE_LENGTH)
    .replace(/-+$/, "");

  return slug || FALLBACK_SLUG_BASE;
}

/** Short random suffix used to disambiguate a colliding slug (e.g. "kronshteyn" → "kronshteyn-a1b2c3"). */
export function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Produces a slug guaranteed unique against `slugExists` (typically a DB
 * lookup). Tries the plain base slug first; on collision, retries a handful
 * of times with a short random suffix appended before giving up with a
 * longer, effectively-unique suffix.
 */
export async function generateUniqueSlug(
  title: string,
  slugExists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(title);

  if (!(await slugExists(base))) {
    return base;
  }

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = `${base}-${randomSlugSuffix()}`;
    if (!(await slugExists(candidate))) {
      return candidate;
    }
  }

  // Extremely unlikely fallback — two suffixes practically guarantee uniqueness.
  return `${base}-${randomSlugSuffix()}-${randomSlugSuffix()}`;
}
