import { recordAuditEvent } from "@modules/audit";
import { NotFoundError } from "@shared/errors";
import type { AuthorPayoutRecord, PayoutStatus } from "../domain/author-balance";
import { listPayoutRequests, updatePayoutStatus } from "../infrastructure/prisma-author-repository";

/**
 * Admin-facing. Callers (the admin module) are responsible for the
 * `requireAdmin()` authorization check before invoking these — this module
 * only knows about payout data, not about who's allowed to touch it.
 */
export async function listAllPayoutRequests(filter?: {
  status?: PayoutStatus;
}): Promise<AuthorPayoutRecord[]> {
  return listPayoutRequests(filter);
}

export async function changePayoutStatus(params: {
  payoutId: string;
  status: PayoutStatus;
  adminId: string;
  note?: string;
}): Promise<AuthorPayoutRecord> {
  try {
    const payout = await updatePayoutStatus({
      payoutId: params.payoutId,
      status: params.status,
      processedByAdminId: params.adminId,
      note: params.note,
    });

    await recordAuditEvent({
      event: "author.payout_status_changed",
      actorUserId: params.adminId,
      actorRole: "ADMIN",
      entityType: "AuthorPayout",
      entityId: payout.id,
      metadata: { status: params.status },
    });

    return payout;
  } catch {
    throw new NotFoundError("Заявка на выплату не найдена");
  }
}
