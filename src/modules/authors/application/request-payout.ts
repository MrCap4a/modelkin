import { recordAuditEvent } from "@modules/audit";
import type { AuthorPayoutRecord, BankDetails } from "../domain/author-balance";
import { assertPayoutRequestAllowed } from "../domain/payout-rules";
import {
  createPayoutRequest,
  getAuthorBalance,
  getLastPayoutRequest,
} from "../infrastructure/prisma-author-repository";

export interface RequestPayoutInput {
  userId: string;
  amount: number;
  bankDetails: BankDetails;
}

/**
 * Validates the amount/cooldown business rules (domain/payout-rules.ts)
 * against the author's current balance, then creates the payout request.
 * Does not itself move money anywhere — an admin later marks it
 * PROCESSING/PAID via the admin module after performing the actual bank
 * transfer out of band (see PDF: "Сумма баланса будет заблокирована до
 * завершения перевода финансовым отделом Моделкина").
 */
export async function requestPayout(input: RequestPayoutInput): Promise<AuthorPayoutRecord> {
  const [balance, lastRequest] = await Promise.all([
    getAuthorBalance(input.userId),
    getLastPayoutRequest(input.userId),
  ]);

  assertPayoutRequestAllowed({
    requestedAmount: input.amount,
    availableForPayout: balance.availableForPayout,
    lastRequestedAt: lastRequest?.requestedAt ?? null,
  });

  const payout = await createPayoutRequest({
    userId: input.userId,
    amount: input.amount,
    bankDetails: input.bankDetails,
  });

  await recordAuditEvent({
    event: "author.payout_requested",
    actorUserId: input.userId,
    actorRole: "USER",
    entityType: "AuthorPayout",
    entityId: payout.id,
    metadata: { amount: payout.amount },
  });

  return payout;
}
