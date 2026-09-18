import { describe, expect, it } from "vitest";
import {
  computeSkip,
  computeTotalPages,
  normalizePage,
  normalizePageSize,
} from "@modules/catalog/../catalog/domain/pagination";

describe("catalog pagination math", () => {
  describe("normalizePage", () => {
    it("defaults missing/undefined page to 1", () => {
      expect(normalizePage(undefined)).toBe(1);
    });

    it("rejects zero, negative and non-finite values", () => {
      expect(normalizePage(0)).toBe(1);
      expect(normalizePage(-5)).toBe(1);
      expect(normalizePage(Number.NaN)).toBe(1);
      expect(normalizePage(Number.POSITIVE_INFINITY)).toBe(1);
    });

    it("floors fractional page numbers", () => {
      expect(normalizePage(2.9)).toBe(2);
    });
  });

  describe("normalizePageSize", () => {
    it("falls back to the default when missing/invalid", () => {
      expect(normalizePageSize(undefined, 8, 48)).toBe(8);
      expect(normalizePageSize(0, 8, 48)).toBe(8);
      expect(normalizePageSize(-1, 8, 48)).toBe(8);
    });

    it("clamps to the max", () => {
      expect(normalizePageSize(1000, 8, 48)).toBe(48);
    });

    it("passes through a valid value", () => {
      expect(normalizePageSize(12, 8, 48)).toBe(12);
    });
  });

  describe("computeSkip", () => {
    it("computes offset for page 1 as 0", () => {
      expect(computeSkip(1, 8)).toBe(0);
    });

    it("computes offset for later pages", () => {
      expect(computeSkip(3, 8)).toBe(16);
      expect(computeSkip(2, 5)).toBe(5);
    });
  });

  describe("computeTotalPages", () => {
    it("is always at least 1, even with zero results", () => {
      expect(computeTotalPages(0, 8)).toBe(1);
    });

    it("rounds up partial pages", () => {
      expect(computeTotalPages(9, 8)).toBe(2);
      expect(computeTotalPages(16, 8)).toBe(2);
      expect(computeTotalPages(17, 8)).toBe(3);
    });
  });
});
