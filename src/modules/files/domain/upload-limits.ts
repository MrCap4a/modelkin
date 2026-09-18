import type { StoragePrefix } from "@infrastructure/storage";
import { ValidationError } from "@shared/errors";

const MB = 1024 * 1024;

/**
 * Per-prefix max upload size (ТЗ §46 — "ограничить размер"). `customOrders`
 * matches the PDF copy on the custom-order screen exactly: "Поддерживаются
 * JPG, PNG, PDF до 20 МБ". `models` (STL) gets a generous ceiling since 3D
 * print files can be large; `avatars`/`previews` are small display images.
 */
export const MAX_UPLOAD_SIZE_BYTES: Record<StoragePrefix, number> = {
  avatars: 5 * MB,
  previews: 5 * MB,
  models: 200 * MB,
  customOrders: 20 * MB,
};

/**
 * Pure validation rule — no server-only / DB / network imports — kept
 * separate from `requestUploadUrl` (which also does rate limiting and calls
 * S3) so the size-limit business rule itself is unit-testable in isolation.
 */
export function assertContentLengthWithinLimit(prefix: StoragePrefix, contentLength: number): void {
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw new ValidationError("Некорректный размер файла");
  }

  const maxSize = MAX_UPLOAD_SIZE_BYTES[prefix];
  if (contentLength > maxSize) {
    throw new ValidationError(
      `Размер файла превышает допустимый лимит (${Math.floor(maxSize / MB)} МБ)`,
    );
  }
}
