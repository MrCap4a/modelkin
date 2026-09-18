import { prisma } from "@infrastructure/database";
import { RateLimitError } from "@shared/errors";

export interface RateLimitOptions {
  /** Logical bucket key, e.g. `login:ip:1.2.3.4` or `upload:user:<id>`. */
  key: string;
  /** Max requests allowed within the window. */
  limit: number;
  windowSeconds: number;
}

/**
 * Simple fixed-window counter backed by a Postgres table (ТЗ §67: no
 * Redis/queue introduced just for this). Correct for the single-instance
 * deployment this project targets; documented in SECURITY.md as the
 * upgrade path (swap for a Redis-backed limiter) if the app is scaled to
 * multiple instances.
 */
export async function checkRateLimit(
  options: RateLimitOptions,
): Promise<{ allowed: boolean; remaining: number }> {
  const windowMs = options.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key_windowStart: { key: options.key, windowStart } },
    create: { key: options.key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  const allowed = bucket.count <= options.limit;
  return { allowed, remaining: Math.max(0, options.limit - bucket.count) };
}

/** Throws RateLimitError when the caller has exceeded the configured limit. */
export async function enforceRateLimit(options: RateLimitOptions): Promise<void> {
  const { allowed } = await checkRateLimit(options);
  if (!allowed) {
    throw new RateLimitError("Слишком много попыток. Повторите позже.");
  }
}

/**
 * Best-effort cleanup for old buckets. Intended to be invoked periodically
 * by the background job worker so the table doesn't grow unbounded.
 */
export async function pruneExpiredRateLimitBuckets(olderThan: Date): Promise<number> {
  const result = await prisma.rateLimitBucket.deleteMany({
    where: { windowStart: { lt: olderThan } },
  });
  return result.count;
}
