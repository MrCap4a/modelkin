import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@modules/users/domain/update-profile.schema";
import { updateAvatarSchema } from "@modules/users/domain/update-avatar.schema";

describe("updateProfileSchema", () => {
  it("rejects an empty name", () => {
    expect(updateProfileSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  it("trims whitespace and accepts a valid name", () => {
    const result = updateProfileSchema.safeParse({ name: "  Александр  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Александр");
    }
  });

  it("rejects a name over 120 characters", () => {
    expect(updateProfileSchema.safeParse({ name: "a".repeat(121) }).success).toBe(false);
  });
});

describe("updateAvatarSchema", () => {
  it("rejects an empty storage key", () => {
    expect(updateAvatarSchema.safeParse({ storageKey: "" }).success).toBe(false);
  });

  it("accepts a non-empty storage key", () => {
    expect(updateAvatarSchema.safeParse({ storageKey: "avatars/abc.jpg" }).success).toBe(true);
  });
});
