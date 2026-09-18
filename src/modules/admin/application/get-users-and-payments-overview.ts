import "server-only";
import { prisma } from "@infrastructure/database";
import type { OperationsOverview } from "../domain/operations-overview";

const BUYERS_LIMIT = 100;
const PAYMENTS_LIMIT = 50;

/**
 * For the combined "Операционный центр" screen (design.pdf page 12, part 5)
 * — registered buyers with purchase count/total spent, and recent payments.
 * Authorization (ADMIN-only) is the caller's responsibility. Read-only: no
 * audit event needed (viewing users/payments isn't a state-changing admin
 * action).
 */
export async function getUsersAndPaymentsOverview(): Promise<OperationsOverview> {
  const [users, payments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        name: true,
        email: true,
        orders: {
          where: { status: "PAID" },
          select: { totalAmount: true, items: { select: { id: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: BUYERS_LIMIT,
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: PAYMENTS_LIMIT,
      include: { order: { include: { items: { select: { titleSnapshot: true } } } } },
    }),
  ]);

  const buyers = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      modelsPurchased: user.orders.reduce((sum, order) => sum + order.items.length, 0),
      totalSpent: user.orders.reduce((sum, order) => sum + order.totalAmount, 0),
    }))
    .filter((buyer) => buyer.modelsPurchased > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const paymentSummaries = payments.map((payment) => ({
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    amount: payment.amount,
    modelTitles: payment.order.items.map((item) => item.titleSnapshot),
    createdAt: payment.createdAt,
  }));

  return { buyers, payments: paymentSummaries };
}
