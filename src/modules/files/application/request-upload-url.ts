import "server-only";
import { headers } from "next/headers";
import {
  createPresignedUploadUrl,
  generateStorageKey,
  isExtensionAllowed,
  type StoragePrefix,
} from "@infrastructure/storage";
import { enforceRateLimit, RATE_LIMIT_PRESETS } from "@infrastructure/rate-limit";
import { ValidationError } from "@shared/errors";
import { getCurrentUser } from "@modules/auth";
import { assertContentLengthWithinLimit } from "../domain/upload-limits";

export interface RequestUploadUrlInput {
  prefix: StoragePrefix;
  originalName: string;
  contentType: string;
  contentLength: number;
}

export interface RequestUploadUrlResult {
  uploadUrl: string;
  storageKey: string;
}

async function resolveRateLimitKey(): Promise<string> {
  // Prefer the logged-in user's id (stable, not shared across visitors
  // behind the same NAT/proxy); fall back to client IP for guests.
  const user = await getCurrentUser().catch(() => null);
  if (user) return `upload:user:${user.id}`;

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";
  return `upload:ip:${ip}`;
}

/**
 * Thin, validated wrapper around @infrastructure/storage's presigned-URL
 * primitives (ТЗ §20, §46). Other modules' Server Actions (avatar upload,
 * custom-order attachments, later admin model/preview upload) call this
 * server-side to hand the browser a direct-to-S3 upload URL — the file
 * itself is PUT straight to S3/MinIO from the browser and never proxied
 * through the Next.js server.
 *
 * Deliberately does NOT record a `file.upload` audit event here: this
 * function only issues a URL, it has no way of knowing whether the
 * browser's subsequent PUT to S3 actually succeeds. The caller should
 * record that event once it creates the DB row that owns the resulting
 * `storageKey` (e.g. CustomOrderFile, ModelFile, User.avatarUrl) — see
 * @modules/custom-orders' submitCustomOrder for the reference pattern.
 */
export async function requestUploadUrl(
  input: RequestUploadUrlInput,
): Promise<RequestUploadUrlResult> {
  const rateLimitKey = await resolveRateLimitKey();
  await enforceRateLimit({ key: rateLimitKey, ...RATE_LIMIT_PRESETS.fileUpload });

  assertContentLengthWithinLimit(input.prefix, input.contentLength);

  if (!isExtensionAllowed(input.prefix, input.originalName)) {
    throw new ValidationError("Недопустимый тип файла");
  }

  const storageKey = generateStorageKey(input.prefix, input.originalName);
  const { url } = await createPresignedUploadUrl({
    key: storageKey,
    contentType: input.contentType,
    contentLength: input.contentLength,
  });

  return { uploadUrl: url, storageKey };
}
