/**
 * Pure formatting helper — no I/O, safe for unit tests. Money is always an
 * integer number of kopecks in the domain/DB (ТЗ §13); this only affects
 * display.
 */
export function formatPriceRub(amountInKopecks: number): string {
  const rubles = amountInKopecks / 100;
  const isWhole = Number.isInteger(rubles);

  const formatted = rubles.toLocaleString("ru-RU", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  });

  return `${formatted} ₽`;
}
