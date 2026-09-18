import { ValidationError } from "@shared/errors";
import { getPaymentProvider, type WebhookVerificationInput } from "@infrastructure/payments";
import { recordAuditEvent } from "@modules/audit";
import { applyPaymentStatusTransition } from "../infrastructure/prisma-payment-repository";

/**
 * Shared core of the payment webhook flow (ТЗ §25): verify → resolve status
 * → idempotently transition Payment/Order/ownership. Called by both the
 * real webhook route (`/api/payments/webhook`) and the dev-only
 * mock-completion route (`/api/payments/mock/complete`) so this logic
 * exists exactly once.
 */
export async function processPaymentWebhook(input: WebhookVerificationInput): Promise<void> {
  const provider = getPaymentProvider();

  if (!provider.verifyWebhook(input)) {
    throw new ValidationError("Недействительная подпись webhook");
  }

  const { providerPaymentId, status } = await provider.handleWebhook(input);

  const result = await applyPaymentStatusTransition({
    providerName: provider.providerName,
    providerPaymentId,
    newStatus: status,
  });

  if (!result.changed) return;

  await recordAuditEvent({
    event: "payment.status_changed",
    actorUserId: result.buyerUserId,
    entityType: "Payment",
    entityId: result.paymentId,
    metadata: { orderId: result.orderId, providerPaymentId, status },
  });

  if (result.orderTransitionedToPaid) {
    for (const modelId of result.newlyOwnedModelIds) {
      await recordAuditEvent({
        event: "ownership.created",
        actorUserId: result.buyerUserId,
        entityType: "Model",
        entityId: modelId,
        metadata: { orderId: result.orderId },
      });
    }
  }
}
