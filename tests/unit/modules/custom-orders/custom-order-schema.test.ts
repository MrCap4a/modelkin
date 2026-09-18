import { describe, expect, it } from "vitest";
import { customOrderSubmissionSchema } from "@modules/custom-orders/domain/custom-order-schema";

const base = {
  description: "Нужен кронштейн для полки под углом 45 градусов",
  name: "Александр",
  contactType: "TELEGRAM" as const,
  contactValue: "@alex_print3d",
  files: [],
};

describe("customOrderSubmissionSchema", () => {
  it("accepts a valid submission with no attachments", () => {
    const result = customOrderSubmissionSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("defaults files to an empty array when omitted", () => {
    const { files, ...withoutFiles } = base;
    void files;
    const result = customOrderSubmissionSchema.safeParse(withoutFiles);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.files).toEqual([]);
    }
  });

  it("rejects an empty description", () => {
    const result = customOrderSubmissionSchema.safeParse({ ...base, description: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = customOrderSubmissionSchema.safeParse({ ...base, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty contact value", () => {
    const result = customOrderSubmissionSchema.safeParse({ ...base, contactValue: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid contactType", () => {
    const result = customOrderSubmissionSchema.safeParse({ ...base, contactType: "EMAIL" });
    expect(result.success).toBe(false);
  });

  it("does not enforce phone shape for TELEGRAM/MAX contact values", () => {
    const telegram = customOrderSubmissionSchema.safeParse({
      ...base,
      contactType: "TELEGRAM",
      contactValue: "@any_handle",
    });
    expect(telegram.success).toBe(true);

    const max = customOrderSubmissionSchema.safeParse({
      ...base,
      contactType: "MAX",
      contactValue: "any-max-id",
    });
    expect(max.success).toBe(true);
  });

  it("accepts a phone-shaped contact value for PHONE", () => {
    const result = customOrderSubmissionSchema.safeParse({
      ...base,
      contactType: "PHONE",
      contactValue: "+7 999 123-45-67",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-phone-shaped contact value for PHONE", () => {
    const result = customOrderSubmissionSchema.safeParse({
      ...base,
      contactType: "PHONE",
      contactValue: "@alex_print3d",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "contactValue");
      expect(issue).toBeDefined();
    }
  });

  it("accepts valid attachment metadata", () => {
    const result = customOrderSubmissionSchema.safeParse({
      ...base,
      files: [
        {
          storageKey: "custom-orders/abc123.jpg",
          originalName: "sketch.jpg",
          mimeType: "image/jpeg",
          size: 1024,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an attachment with a non-positive size", () => {
    const result = customOrderSubmissionSchema.safeParse({
      ...base,
      files: [
        {
          storageKey: "custom-orders/abc123.jpg",
          originalName: "sketch.jpg",
          mimeType: "image/jpeg",
          size: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 attachments", () => {
    const files = Array.from({ length: 11 }, (_, i) => ({
      storageKey: `custom-orders/${i}.jpg`,
      originalName: `file-${i}.jpg`,
      mimeType: "image/jpeg",
      size: 100,
    }));
    const result = customOrderSubmissionSchema.safeParse({ ...base, files });
    expect(result.success).toBe(false);
  });
});
