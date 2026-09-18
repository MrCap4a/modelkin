"use server";

import { toSafeError } from "@shared/errors";
import {
  requestUploadUrl,
  type RequestUploadUrlInput,
  type RequestUploadUrlResult,
} from "../application/request-upload-url";

export type RequestUploadUrlActionResult =
  | { ok: true; data: RequestUploadUrlResult }
  | { ok: false; error: string };

/**
 * Server Action wrapper so Client Components (custom-order attachment
 * picker, avatar upload UI, ...) can call `requestUploadUrl` directly
 * without an intermediate `app/api` route. Errors are caught and returned
 * as data rather than thrown: Next.js redacts thrown Server Action error
 * messages in production builds, which would hide the Russian validation
 * copy (e.g. "Размер файла превышает допустимый лимит") from the user.
 */
export async function requestUploadUrlAction(
  input: RequestUploadUrlInput,
): Promise<RequestUploadUrlActionResult> {
  try {
    const data = await requestUploadUrl(input);
    return { ok: true, data };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message };
  }
}
