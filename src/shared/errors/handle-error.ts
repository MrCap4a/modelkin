import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getLogger } from "@shared/logging";
import { AppError, ValidationError, isAppError } from "./app-error";

interface SafeErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Normalizes any thrown value into a safe, client-facing error shape and
 * logs the full detail (including stack trace for unexpected errors)
 * server-side only (ТЗ §40).
 */
export function toSafeError(error: unknown): { status: number; body: SafeErrorBody } {
  const logger = getLogger();

  if (error instanceof ZodError) {
    const validationError = new ValidationError("Ошибка валидации данных", {
      issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    logger.warn({ err: validationError, code: validationError.code }, "request.validation_error");
    return { status: validationError.httpStatus, body: validationError.toJSON() };
  }

  if (isAppError(error)) {
    const level = error.httpStatus >= 500 ? "error" : "warn";
    logger[level]({ err: error, code: error.code }, "request.app_error");
    return { status: error.httpStatus, body: error.toJSON() };
  }

  // Unexpected/unhandled error: full detail (incl. stack) goes to server
  // logs only. The client only ever sees a generic message.
  logger.error({ err: error }, "request.unexpected_error");

  const genericError = {
    error: { code: "INTERNAL_ERROR", message: "Внутренняя ошибка сервера" },
  } satisfies SafeErrorBody;

  return { status: 500, body: genericError };
}

/** Convenience wrapper for `app/api/**` Route Handlers. */
export function handleApiError(error: unknown): NextResponse<SafeErrorBody> {
  const { status, body } = toSafeError(error);
  return NextResponse.json(body, { status });
}

export { AppError };
