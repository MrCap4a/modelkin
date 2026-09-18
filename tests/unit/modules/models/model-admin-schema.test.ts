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

  it("rejects a tag slug outside the fixed catalog set", () => {
    const result = modelAdminInputSchema.safeParse({ ...base, tagSlugs: ["not-a-real-tag"] });
    expect(result.success).toBe(false);
  });

  it("accepts every fixed catalog tag slug", () => {
    const result = modelAdminInputSchema.safeParse({
      ...base,
      tagSlugs: ["organayzery", "dekor-i-interer", "instrumenty", "avto", "poleznye-veshchi"],
    });
    expect(result.success).toBe(true);
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
