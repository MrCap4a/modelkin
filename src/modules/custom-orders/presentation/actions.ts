"use server";

import { toSafeError } from "@shared/errors";
import { submitCustomOrder } from "../application/submit-custom-order";
import type { CustomOrderSubmissionInput } from "../domain/custom-order-schema";

export type SubmitCustomOrderActionResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Server Action used directly by the public custom-order form
 * (src/app/(public)/custom-order). Errors are returned as data rather than
 * thrown: Next.js redacts thrown Server Action error messages in
 * production, which would hide the Russian validation copy from the user.
 */
export async function submitCustomOrderAction(
  input: CustomOrderSubmissionInput,
): Promise<SubmitCustomOrderActionResult> {
  try {
    const { id } = await submitCustomOrder(input);
    return { ok: true, id };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message };
  }
}
