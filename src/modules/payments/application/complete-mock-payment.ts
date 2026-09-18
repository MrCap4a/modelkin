import { z } from "zod";
import { AuthorizationError, NotFoundError } from "@shared/errors";
// Concrete mock-provider import is intentional: `buildWebhookRequest` is a
// dev/E2E-only helper that isn't part of the generic `PaymentProvider`
// interface (see @infrastructure/payments/mock-payment-provider). Once a
// real provider is wired in, this whole route/use case is removed.
import { getMockPaymentProvider } from "@infrastructure/payments/mock-payment-provider";
import { findPaymentOrderOwner } from "../infrastructure/prisma-payment-repository";
import { processPaymentWebhook } from "./process-payment-webhook";

export const completeMockPaymentSchema = z.object({
  providerPaymentId: z.string().min(1),
  status: z.enum(["PAID", "FAILED"]),
});

export type CompleteMockPaymentInput = z.infer<typeof completeMockPaymentSchema>;

/**
 * Dev/E2E-only: lets the logged-in buyer manually resolve their own mock
 * payment to PAID/FAILED, then routes it through the exact same webhook
 * logic a real provider callback would hit — no duplicated transaction code.
 */
export async function completeMockPayment(
  userId: string,
  input: CompleteMockPaymentInput,
): Promise<void> {
  const owner = await findPaymentOrderOwner(input.providerPaymentId);
  if (!owner) {
    throw new NotFoundError("Платёж не найден");
  }
  if (owner.userId !== userId) {
    throw new AuthorizationError("Этот платёж принадлежит другому пользователю");
  }

  const webhookRequest = getMockPaymentProvider().buildWebhookRequest(
    input.providerPaymentId,
    input.status,
  );
  await processPaymentWebhook(webhookRequest);
}
