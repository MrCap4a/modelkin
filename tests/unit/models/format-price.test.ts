import { describe, expect, it } from "vitest";
import { formatPriceRub } from "@modules/models";

describe("formatPriceRub", () => {
  it("formats a whole-ruble amount without decimals", () => {
    expect(formatPriceRub(35000)).toBe("350 ₽");
  });

  it("formats a fractional-ruble amount with two decimals", () => {
    expect(formatPriceRub(19999)).toBe("199,99 ₽");
  });

  it("formats zero", () => {
    expect(formatPriceRub(0)).toBe("0 ₽");
  });

  it("groups thousands using Russian locale formatting (non-breaking space separator)", () => {
    expect(formatPriceRub(150000000)).toBe("1 500 000 ₽");
  });
});
