import { describe, expect, it } from "vitest";
import { generateUniqueSlug, slugify, transliterate } from "@modules/models/domain/generate-slug";

describe("transliterate", () => {
  it("converts Cyrillic characters to Latin equivalents", () => {
    expect(transliterate("Кронштейн")).toBe("kronshteyn");
  });

  it("passes non-Cyrillic characters through unchanged (lowercased)", () => {
    expect(transliterate("STL Model 123")).toBe("stl model 123");
  });

  it("handles ё, щ, ъ, ь, ю, я correctly", () => {
    expect(transliterate("Ёлка щётка объём коньяк")).toBe("elka schetka obem konyak");
  });
});

describe("slugify", () => {
  it("produces a lowercase, hyphenated, URL-safe slug from a Cyrillic title", () => {
    expect(slugify("Кронштейн для наушников под стол")).toBe("kronshteyn-dlya-naushnikov-pod-stol");
  });

  it("collapses punctuation and repeated separators into single hyphens", () => {
    expect(slugify("Кашпо — «Венера», геометрическое!!!")).toBe("kashpo-venera-geometricheskoe");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  - Органайзер -  ")).toBe("organayzer");
  });

  it("falls back to a default base when the title has no sluggable characters", () => {
    expect(slugify("???")).toBe("model");
  });

  it("truncates very long titles to a bounded length", () => {
    const longTitle = "Модель ".repeat(30);
    expect(slugify(longTitle).length).toBeLessThanOrEqual(80);
  });
});

describe("generateUniqueSlug — collision handling", () => {
  it("returns the plain base slug when it doesn't collide", async () => {
    const slug = await generateUniqueSlug("Органайзер под отвёртки", async () => false);
    expect(slug).toBe("organayzer-pod-otvertki");
  });

  it("appends a random suffix when the base slug collides once", async () => {
    let calls = 0;
    const slug = await generateUniqueSlug("Настольная лампа", async () => {
      calls += 1;
      // First check (base slug) collides; every subsequent (suffixed) candidate is free.
      return calls === 1;
    });
    expect(slug).toMatch(/^nastolnaya-lampa-[a-z0-9]{6}$/);
    expect(calls).toBe(2);
  });

  it("retries multiple times under repeated collisions before eventually succeeding", async () => {
    let calls = 0;
    const slug = await generateUniqueSlug("Держатель кабеля", async () => {
      calls += 1;
      return calls <= 3; // base + 2 suffixed attempts collide, 3rd suffixed attempt is free
    });
    expect(slug.startsWith("derzhatel-kabelya")).toBe(true);
    expect(calls).toBe(4);
  });

  it("still returns a slug (with a longer fallback suffix) if every attempt collides", async () => {
    const slug = await generateUniqueSlug("Защитный колпачок", async () => true);
    expect(slug.startsWith("zaschitnyy-kolpachok-")).toBe(true);
    // base + two suffixes joined by hyphens
    expect(slug.split("-").length).toBeGreaterThanOrEqual(4);
  });
});
