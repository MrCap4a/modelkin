import type { AuthorBalanceSummary, AuthorModelSummary, AuthorSaleRecord } from "../domain/author-balance";
import {
  getAuthorBalance,
  hasAuthoredModels,
  listAuthorModelSummaries,
  listAuthorSales,
} from "../infrastructure/prisma-author-repository";

/** Used by the profile module to decide whether to show the "Кабинет автора" tab at all. */
export async function isAuthor(userId: string): Promise<boolean> {
  return hasAuthoredModels(userId);
}

export interface AuthorDashboard {
  balance: AuthorBalanceSummary;
  models: AuthorModelSummary[];
}

export async function getAuthorDashboard(userId: string): Promise<AuthorDashboard> {
  const [balance, models] = await Promise.all([
    getAuthorBalance(userId),
    listAuthorModelSummaries(userId),
  ]);
  return { balance, models };
}

export async function getModelSalesHistory(
  userId: string,
  modelId: string,
): Promise<AuthorSaleRecord[]> {
  return listAuthorSales(userId, modelId);
}
