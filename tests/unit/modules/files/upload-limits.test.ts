import { describe, expect, it } from "vitest";
import { isExtensionAllowed } from "@infrastructure/storage";
import {
  MAX_UPLOAD_SIZE_BYTES,
  assertContentLengthWithinLimit,
} from "@modules/files/domain/upload-limits";

describe("assertContentLengthWithinLimit", () => {
  it("allows a customOrders file within the 20 MB limit (matches the PDF copy)", () => {
    expect(() => assertContentLengthWithinLimit("customOrders", 19 * 1024 * 1024)).not.toThrow();
  });

  it("rejects a customOrders file over 20 MB", () => {
    expect(() =>
      assertContentLengthWithinLimit("customOrders", MAX_UPLOAD_SIZE_BYTES.customOrders + 1),
    ).toThrow(/превышает допустимый лимит/);
  });

  it("rejects a zero-byte file", () => {
    expect(() => assertContentLengthWithinLimit("customOrders", 0)).toThrow(
      /Некорректный размер файла/,
    );
  });

  it("rejects a negative size", () => {
    expect(() => assertContentLengthWithinLimit("avatars", -1)).toThrow(/Некорректный размер файла/);
  });

  it("allows an avatar exactly at the 5 MB limit", () => {
    expect(() =>
      assertContentLengthWithinLimit("avatars", MAX_UPLOAD_SIZE_BYTES.avatars),
    ).not.toThrow();
  });

  it("rejects an avatar 1 byte over the 5 MB limit", () => {
    expect(() =>
      assertContentLengthWithinLimit("avatars", MAX_UPLOAD_SIZE_BYTES.avatars + 1),
    ).toThrow();
  });

  it("allows a model (STL) file up to 200 MB", () => {
    expect(() =>
      assertContentLengthWithinLimit("models", MAX_UPLOAD_SIZE_BYTES.models),
    ).not.toThrow();
    expect(() =>
      assertContentLengthWithinLimit("models", MAX_UPLOAD_SIZE_BYTES.models + 1),
    ).toThrow();
  });
});

describe("isExtensionAllowed (customOrders prefix, re-exported from @infrastructure/storage)", () => {
  it.each([".jpg", ".jpeg", ".png", ".pdf", ".webp"])(
    "allows %s attachments",
    (ext) => {
      expect(isExtensionAllowed("customOrders", `sketch${ext}`)).toBe(true);
    },
  );

  it.each([".exe", ".stl", ".zip", ".svg"])("rejects %s attachments", (ext) => {
    expect(isExtensionAllowed("customOrders", `file${ext}`)).toBe(false);
  });

  it("only allows .stl for the models prefix", () => {
    expect(isExtensionAllowed("models", "part.stl")).toBe(true);
    expect(isExtensionAllowed("models", "part.jpg")).toBe(false);
  });
});
