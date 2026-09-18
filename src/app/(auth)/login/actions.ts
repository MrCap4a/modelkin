"use server";

import { loginUser, getClientIp, type LoginInput } from "@modules/auth";
import { toSafeError } from "@shared/errors";
import { fieldErrorsFrom, type ActionResult } from "../_components/action-result";

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  try {
    const ip = await getClientIp();
    await loginUser(input, { ip });
    return { ok: true, data: undefined };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}
