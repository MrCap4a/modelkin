import { describe, expect, it } from "vitest";
import { modelAdminInputSchema, modelAdminUpdateSchema } from "@modules/models/domain/model-admin-schema";

const base = {
  title: "Кронштейн для наушников",
  description: "Удобное крепление под стол, печать без поддержек",
  price: 29_000,
  tagSlugs: ["instrumenty"],
  authorEmail: "",
};

describe("modelAdminInputSchema", () => {
  it("accepts a valid full input", () => {
    expect(modelAdminInputSchema.safeParse(base).success).toBe(true);
  });

  it("defaults tagSlugs to an empty array when omitted", () => {
    const { tagSlugs, ...withoutTags } = base;
    void tagSlugs;
    const result = modelAdminInputSchema.safeParse(withoutTags);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagSlugs).toEqual([]);
    }
  });

  it("rejects a title shorter than 3 characters", () => {
    expect(modelAdminInputSchema.safeParse({ ...base, title: "Ab" }).success).toBe(false);
  });

  it("rejects a description shorter than 10 characters", () => {
    expect(modelAdminInputSchema.safeParse({ ...base, description: "Коротко" }).success).toBe(false);
  });

  it("rejects a non-integer price", () => {
    expect(modelAdminInputSchema.safeParse({ ...base, price: 199.5 }).success).toBe(false);
  });

  it("rejects a zero or negative price", () => {
    expect(modelAdminInputSchema.safeParse({ ...base, price: 0 }).success).toBe(false);
    expect(modelAdminInputSchema.safeParse({ ...base, price: -100 }).success).toBe(false);
  });

  it("accepts any non-empty tag slug string (categories are admin-managed, not a fixed enum)", () => {
    // Membership in the real category set is checked downstream against the
    // DB (findTagIdsBySlugs silently drops unknown slugs) — the schema only
    // validates shape, since @modules/tags lets admins add/rename/delete
    // categories at runtime.
    const result = modelAdminInputSchema.safeParse({
      ...base,
      tagSlugs: ["any-slug-the-db-may-or-may-not-have"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty-string tag slug", () => {
    const result = modelAdminInputSchema.safeParse({ ...base, tagSlugs: [""] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 tag slugs", () => {
    const result = modelAdminInputSchema.safeParse({
      ...base,
      tagSlugs: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty authorEmail (no author)", () => {
    expect(modelAdminInputSchema.safeParse({ ...base, authorEmail: "" }).success).toBe(true);
  });

  it("rejects a malformed authorEmail", () => {
    expect(modelAdminInputSchema.safeParse({ ...base, authorEmail: "not-an-email" }).success).toBe(false);
  });

  it("accepts a well-formed authorEmail", () => {
    expect(modelAdminInputSchema.safeParse({ ...base, authorEmail: "author@example.com" }).success).toBe(
      true,
    );
  });
});

describe("modelAdminUpdateSchema", () => {
  it("accepts an empty object (no fields to update)", () => {
    expect(modelAdminUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a partial update with just a price change", () => {
    const result = modelAdminUpdateSchema.safeParse({ price: 50_000 });
    expect(result.success).toBe(true);
  });

  it("still validates a provided field against the same rules as create", () => {
    expect(modelAdminUpdateSchema.safeParse({ price: -1 }).success).toBe(false);
    expect(modelAdminUpdateSchema.safeParse({ title: "Ab" }).success).toBe(false);
  });
});
