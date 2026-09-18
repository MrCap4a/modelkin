import { Prisma } from "@prisma/client";
import { prisma } from "@infrastructure/database";
import { NotFoundError } from "@shared/errors";
import { getConfig } from "@shared/config";
import type { PaymentProviderStatus } from "@infrastructure/payments";
import { calculateAuthorEarning } from "@modules/authors";
import { decidePaymentTransition } from "../domain/decide-payment-transition";
import type { PaymentTransitionResult } from "../domain/payment-transition-result";

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Idempotently applies a payment-provider status to the matching `Payment`
 * row and, on a fresh transition to PAID, cascades: `Order` → PAID,
 * `OrderItem` author-earnings snapshot, `UserModelOwnership` creation — all
 * inside one transaction (ТЗ §25/§64/§65).
 *
 * Idempotency is layered:
 *  - `payment.status === newStatus` (exact replay) or already `PAID`
 *    (never downgraded) short-circuits before any write.
 *  - Each `UserModelOwnership` insert is individually guarded by
 *    `@@unique([userId, modelId])` — a duplicate webhook racing a first one
 *    (or reprocessing after a crash) can't create a second ownership row.
 */
export async function applyPaymentStatusTransition(params: {
  providerName: string;
  providerPaymentId: string;
  newStatus: PaymentProviderStatus;
}): Promise<PaymentTransitionResult> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        provider_providerPaymentId: {
          provider: params.providerName,
          providerPaymentId: params.providerPaymentId,
        },
      },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundError("Платёж не найден", {
        providerPaymentId: params.providerPaymentId,
      });
    }

    const buyerUserId = payment.order.userId;

    const decision = decidePaymentTransition({
      currentPaymentStatus: payment.status,
      currentOrderStatus: payment.order.status,
      incomingStatus: params.newStatus,
    });

    if (decision.isNoOp) {
      return {
        changed: false,
        paymentId: payment.id,
        orderId: payment.orderId,
        buyerUserId,
        orderTransitionedToPaid: false,
        newlyOwnedModelIds: [],
      };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: decision.nextPaymentStatus },
    });

    if (!decision.shouldProcessOwnership) {
      return {
        changed: true,
        paymentId: payment.id,
        orderId: payment.orderId,
        buyerUserId,
        orderTransitionedToPaid: false,
        newlyOwnedModelIds: [],
      };
    }

    if (decision.shouldTransitionOrderToPaid) {
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
    }

    const commissionBps = getConfig().commerce.platformCommissionBps;
    const items = await tx.orderItem.findMany({
      where: { orderId: payment.orderId },
      include: { model: { select: { authorId: true } }, ownership: true },
    });

    const newlyOwnedModelIds: string[] = [];

    for (const item of items) {
      if (item.ownership) continue; // already granted — idempotent re-entry.

      const authorId = item.model.authorId;
      if (authorId) {
        const authorEarningAmount = calculateAuthorEarning(item.priceSnapshot, commissionBps);
        await tx.orderItem.update({
          where: { id: item.id },
          data: { authorId, commissionBps, authorEarningAmount },
        });
      }

      try {
        await tx.userModelOwnership.create({
          data: { userId: buyerUserId, modelId: item.modelId, orderItemId: item.id },
        });
        newlyOwnedModelIds.push(item.modelId);
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) throw error;
        // Already owned (concurrent/duplicate webhook race) — no-op.
      }
    }

    return {
      changed: true,
      paymentId: payment.id,
      orderId: payment.orderId,
      buyerUserId,
      orderTransitionedToPaid: decision.shouldTransitionOrderToPaid,
      newlyOwnedModelIds,
    };
  });
}

export async function findPaymentOrderOwner(
  providerPaymentId: string,
): Promise<{ orderId: string; userId: string } | null> {
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId },
    include: { order: { select: { userId: true } } },
  });
  if (!payment) return null;
  return { orderId: payment.orderId, userId: payment.order.userId };
}
