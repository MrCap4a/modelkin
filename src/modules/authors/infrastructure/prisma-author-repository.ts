import type { Prisma } from "@prisma/client";
import { prisma } from "@infrastructure/database";
import type {
  AuthorBalanceSummary,
  AuthorModelSummary,
  AuthorPayoutRecord,
  AuthorSaleRecord,
  BankDetails,
} from "../domain/author-balance";

function toPayoutRecord(row: {
  id: string;
  userId: string;
  amount: number;
  status: string;
  bankDetailsSnapshot: unknown;
  requestedAt: Date;
  processedAt: Date | null;
  note: string | null;
}): AuthorPayoutRecord {
  return {
    id: row.id,
    userId: row.userId,
    amount: row.amount,
    status: row.status as AuthorPayoutRecord["status"],
    bankDetails: row.bankDetailsSnapshot as BankDetails,
    requestedAt: row.requestedAt,
    processedAt: row.processedAt,
    note: row.note,
  };
}

export async function hasAuthoredModels(userId: string): Promise<boolean> {
  const count = await prisma.model.count({ where: { authorId: userId } });
  return count > 0;
}

export async function getAuthorBalance(userId: string): Promise<AuthorBalanceSummary> {
  const [earningsAgg, paidAgg, pendingAgg] = await Promise.all([
    prisma.orderItem.aggregate({
      where: { authorId: userId, order: { status: "PAID" } },
      _sum: { authorEarningAmount: true },
    }),
    prisma.authorPayout.aggregate({
      where: { userId, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.authorPayout.aggregate({
      where: { userId, status: { in: ["REQUESTED", "PROCESSING"] } },
      _sum: { amount: true },
    }),
  ]);

  const totalNetEarnings = earningsAgg._sum.authorEarningAmount ?? 0;
  const totalPaidOut = paidAgg._sum.amount ?? 0;
  const totalPendingPayout = pendingAgg._sum.amount ?? 0;

  return {
    totalNetEarnings,
    totalPaidOut,
    totalPendingPayout,
    availableForPayout: Math.max(0, totalNetEarnings - totalPaidOut - totalPendingPayout),
  };
}

export async function listAuthorModelSummaries(userId: string): Promise<AuthorModelSummary[]> {
  const models = await prisma.model.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      orderItems: {
        where: { order: { status: "PAID" } },
        select: { priceSnapshot: true, authorEarningAmount: true },
      },
    },
  });

  return models.map((model) => ({
    modelId: model.id,
    title: model.title,
    price: model.price,
    status: model.status,
    salesCount: model.orderItems.length,
    grossRevenue: model.orderItems.reduce((sum, item) => sum + item.priceSnapshot, 0),
    netEarnings: model.orderItems.reduce((sum, item) => sum + (item.authorEarningAmount ?? 0), 0),
  }));
}

export async function listAuthorSales(
  userId: string,
  modelId?: string,
): Promise<AuthorSaleRecord[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      authorId: userId,
      order: { status: "PAID" },
      ...(modelId ? { modelId } : {}),
    },
    orderBy: { order: { createdAt: "desc" } },
    include: { order: { include: { user: true } } },
  });

  return items.map((item) => ({
    orderItemId: item.id,
    modelId: item.modelId,
    modelTitle: item.titleSnapshot,
    buyerName: item.order.user.name,
    buyerEmail: item.order.user.email,
    priceAmount: item.priceSnapshot,
    authorEarningAmount: item.authorEarningAmount ?? 0,
    soldAt: item.order.createdAt,
  }));
}

export async function getLastPayoutRequest(userId: string): Promise<AuthorPayoutRecord | null> {
  const row = await prisma.authorPayout.findFirst({
    where: { userId },
    orderBy: { requestedAt: "desc" },
  });
  return row ? toPayoutRecord(row) : null;
}

export async function createPayoutRequest(params: {
  userId: string;
  amount: number;
  bankDetails: BankDetails;
}): Promise<AuthorPayoutRecord> {
  const row = await prisma.authorPayout.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      status: "REQUESTED",
      bankDetailsSnapshot: params.bankDetails as unknown as Prisma.InputJsonValue,
    },
  });
  return toPayoutRecord(row);
}

export async function listPayoutRequests(filter?: {
  status?: AuthorPayoutRecord["status"];
}): Promise<AuthorPayoutRecord[]> {
  const rows = await prisma.authorPayout.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { requestedAt: "desc" },
  });
  return rows.map(toPayoutRecord);
}

export async function updatePayoutStatus(params: {
  payoutId: string;
  status: AuthorPayoutRecord["status"];
  processedByAdminId: string;
  note?: string;
}): Promise<AuthorPayoutRecord> {
  const row = await prisma.authorPayout.update({
    where: { id: params.payoutId },
    data: {
      status: params.status,
      processedAt: new Date(),
      processedByAdminId: params.processedByAdminId,
      note: params.note,
    },
  });
  return toPayoutRecord(row);
}
