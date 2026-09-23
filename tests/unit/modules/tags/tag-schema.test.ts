import { describe, expect, it } from "vitest";
import { tagInputSchema, tagSeoInputSchema } from "@modules/tags/domain/tag-schema";

describe("tagInputSchema", () => {
  it("accepts a valid name", () => {
    expect(tagInputSchema.safeParse({ name: "Органайзеры" }).success).toBe(true);
  });

  it("trims whitespace", () => {
    const result = tagInputSchema.safeParse({ name: "  Декор  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Декор");
    }
  });

  it("rejects a name shorter than 2 characters", () => {
    expect(tagInputSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("rejects a name longer than 60 characters", () => {
    expect(tagInputSchema.safeParse({ name: "A".repeat(61) }).success).toBe(false);
  });

  it("rejects a missing name", () => {
    expect(tagInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("tagSeoInputSchema", () => {
  const base = { seoIndexed: false, seoTitle: "", seoH1: "", seoDescription: "" };

  it("accepts the off-by-default shape (empty overrides, not indexed)", () => {
    expect(tagSeoInputSchema.safeParse(base).success).toBe(true);
  });

  it("accepts turning indexing on with real SEO copy", () => {
    const result = tagSeoInputSchema.safeParse({
      seoIndexed: true,
      seoTitle: "TPU — STL модели",
      seoH1: "Модели для печати TPU",
      seoDescription: "Гибкие модели, проверенные печатью TPU-пластиком.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a seoTitle longer than 90 characters", () => {
    expect(tagSeoInputSchema.safeParse({ ...base, seoTitle: "x".repeat(91) }).success).toBe(false);
  });

  it("rejects a seoH1 longer than 90 characters", () => {
    expect(tagSeoInputSchema.safeParse({ ...base, seoH1: "x".repeat(91) }).success).toBe(false);
  });

  it("rejects a seoDescription longer than 300 characters", () => {
    expect(tagSeoInputSchema.safeParse({ ...base, seoDescription: "x".repeat(301) }).success).toBe(
      false,
    );
  });

  it("requires seoIndexed to be a plain boolean, not omitted", () => {
    const { seoIndexed, ...withoutIndexed } = base;
    void seoIndexed;
    expect(tagSeoInputSchema.safeParse(withoutIndexed).success).toBe(false);
  });
});
