import { describe, expect, it } from "vitest";
import { tagInputSchema } from "@modules/tags/domain/tag-schema";

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
