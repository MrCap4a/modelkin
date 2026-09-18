import type { Prisma } from "@prisma/client";
import { prisma } from "@infrastructure/database";
import { getLogger } from "@shared/logging";

/**
 * Minimal Postgres-backed job queue (ТЗ §67: background-job abstraction
 * without introducing Redis/BullMQ just for the sake of a queue). Good
 * enough for the current workload (transactional emails, and later STL
 * preview generation, §68); swapping the implementation for a real queue
 * later does not require changing any call site, since callers only see
 * `enqueueJob` / `registerJobHandler`.
 */
export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  runAt: Date = new Date(),
): Promise<string> {
  const job = await prisma.job.create({
    data: { type, payload: payload as Prisma.InputJsonValue, runAt },
  });
  return job.id;
}

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

const MAX_ATTEMPTS = 5;

/** Processes one batch of due jobs. Called repeatedly by the worker loop. */
export async function processDueJobs(batchSize = 10): Promise<number> {
  const dueJobs = await prisma.job.findMany({
    where: { status: "PENDING", runAt: { lte: new Date() } },
    orderBy: { runAt: "asc" },
    take: batchSize,
  });

  let processed = 0;

  for (const job of dueJobs) {
    const claimed = await prisma.job.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) continue; // claimed by another worker instance

    const handler = handlers.get(job.type);
    if (!handler) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "FAILED", lastError: `No handler registered for type "${job.type}"` },
      });
      continue;
    }

    try {
      await handler(job.payload as Record<string, unknown>);
      await prisma.job.update({ where: { id: job.id }, data: { status: "COMPLETED" } });
      processed += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      const failed = attempts >= MAX_ATTEMPTS;
      getLogger().error(
        { err: error, jobId: job.id, jobType: job.type, attempts },
        "job.processing_failed",
      );
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: failed ? "FAILED" : "PENDING",
          attempts,
          lastError: error instanceof Error ? error.message : String(error),
          // simple backoff: retry after attempts^2 minutes
          runAt: failed ? job.runAt : new Date(Date.now() + attempts * attempts * 60_000),
        },
      });
    }
  }

  return processed;
}
