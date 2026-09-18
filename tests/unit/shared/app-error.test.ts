import { describe, expect, it } from "vitest";
import { ValidationError, NotFoundError, isAppError } from "@shared/errors";

describe("AppError hierarchy", () => {
  it("exposes the right HTTP status per error type", () => {
    expect(new ValidationError("bad input").httpStatus).toBe(400);
    expect(new NotFoundError("missing").httpStatus).toBe(404);
  });

  it("serializes to a safe JSON body without leaking internals", () => {
    const error = new ValidationError("Некорректный email", { field: "email" });
    const json = error.toJSON();

    expect(json).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Некорректный email",
        details: { field: "email" },
      },
    });
    expect(json).not.toHaveProperty("stack");
  });

  it("isAppError narrows only known application errors", () => {
    expect(isAppError(new NotFoundError("x"))).toBe(true);
    expect(isAppError(new Error("plain"))).toBe(false);
  });
});
