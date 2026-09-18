/**
 * Pure pagination math — no I/O, safe for unit tests. Keeping this isolated
 * from the repository means "page 0 / negative page / absurd pageSize from a
 * hand-edited URL" is defined behavior instead of an accidental Prisma
 * error.
 */

export function normalizePage(page: number | undefined): number {
  if (!page || !Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function normalizePageSize(
  pageSize: number | undefined,
  fallback: number,
  max: number,
): number {
  if (!pageSize || !Number.isFinite(pageSize) || pageSize < 1) return fallback;
  return Math.min(Math.floor(pageSize), max);
}

export function computeSkip(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function computeTotalPages(total: number, pageSize: number): number {
  if (pageSize <= 0 || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
