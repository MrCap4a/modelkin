"use server";

import { requireUser } from "@modules/auth";
import { requestPayout, type BankDetails } from "@modules/authors";
import { toSafeError } from "@shared/errors";

export type RequestPayoutResult = { ok: true } | { ok: false; error: string };

export async function requestPayoutAction(
  amount: number,
  bankDetails: BankDetails,
): Promise<RequestPayoutResult> {
  try {
    const user = await requireUser();
    await requestPayout({ userId: user.id, amount, bankDetails });
    return { ok: true };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message };
  }
}
