import { ValidationError } from "@shared/errors";

/** Matches the PDF author-cabinet copy: "Минимальная сумма вывода: 1 000 ₽". */
export const MIN_PAYOUT_AMOUNT = 100_000; // kopecks

/** Matches the PDF copy: "Выплату можно запрашивать не чаще одного раза в 7 дней". */
export const PAYOUT_COOLDOWN_DAYS = 7;

export function assertPayoutRequestAllowed(params: {
  requestedAmount: number;
  availableForPayout: number;
  lastRequestedAt: Date | null;
  now?: Date;
}): void {
  const now = params.now ?? new Date();

  if (params.requestedAmount <= 0) {
    throw new ValidationError("Сумма выплаты должна быть положительной");
  }

  if (params.requestedAmount > params.availableForPayout) {
    throw new ValidationError("Сумма выплаты превышает доступный для вывода баланс");
  }

  if (params.requestedAmount < MIN_PAYOUT_AMOUNT) {
    throw new ValidationError(
      `Минимальная сумма вывода — ${(MIN_PAYOUT_AMOUNT / 100).toLocaleString("ru-RU")} ₽`,
    );
  }

  if (params.lastRequestedAt) {
    const cooldownMs = PAYOUT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const elapsedMs = now.getTime() - params.lastRequestedAt.getTime();
    if (elapsedMs < cooldownMs) {
      throw new ValidationError(
        `Выплату можно запрашивать не чаще одного раза в ${PAYOUT_COOLDOWN_DAYS} дней`,
      );
    }
  }
}

/** Computes an author's net earning for one sale — same formula used by prisma/seed.ts. */
export function calculateAuthorEarning(priceSnapshot: number, commissionBps: number): number {
  return Math.round((priceSnapshot * (10_000 - commissionBps)) / 10_000);
}
