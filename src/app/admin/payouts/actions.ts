"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@modules/auth";
import { changePayoutStatus, type AuthorPayoutRecord, type PayoutStatus } from "@modules/authors";
import { toSafeError } from "@shared/errors";
import { fieldErrorsFrom, type ActionResult } from "../_lib/action-result";

export async function changePayoutStatusAction(
  payoutId: string,
  status: PayoutStatus,
  note?: string,
): Promise<ActionResult<AuthorPayoutRecord>> {
  try {
    const admin = await requireAdmin();
    const payout = await changePayoutStatus({ payoutId, status, adminId: admin.id, note });
    revalidatePath("/admin/payouts");
    return { ok: true, data: payout };
  } catch (error) {
    const { body } = toSafeError(error);
    return { ok: false, error: body.error.message, fieldErrors: fieldErrorsFrom(body.error.details) };
  }
}
