"use server";

import { confirmPasswordReset, getClientIp, type ConfirmPasswordResetInput } from "@modules/auth";
import { toSafeError } from "@shared/errors";
import { fieldErrorsFrom, type ActionResult } from "../../_components/action-result";

export async function confirmPasswordResetAction(
  input: ConfirmPasswordResetInput,
): Promise<ActionResult> {
  try {
    const ip = await getClientIp();
    await confirmPasswordReset(input, { ip });
    return { ok: true, data: undefined };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}
