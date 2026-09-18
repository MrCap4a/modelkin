import { getLogger } from "@shared/logging";
import { processDueJobs } from "./job-queue";
import { registerAllJobHandlers } from "./register-handlers";
import { pruneExpiredRateLimitBuckets } from "@infrastructure/rate-limit";

const POLL_INTERVAL_MS = 5000;
const RATE_LIMIT_PRUNE_INTERVAL_MS = 60 * 60 * 1000;

let shuttingDown = false;

async function loop(): Promise<void> {
  const logger = getLogger();
  logger.info({ event: "worker.started" }, "worker.started");

  registerAllJobHandlers();

  let lastPrune = 0;

  while (!shuttingDown) {
    try {
      await processDueJobs();

      if (Date.now() - lastPrune > RATE_LIMIT_PRUNE_INTERVAL_MS) {
        await pruneExpiredRateLimitBuckets(new Date(Date.now() - 24 * 60 * 60 * 1000));
        lastPrune = Date.now();
      }
    } catch (error) {
      logger.error({ err: error }, "worker.loop_error");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  logger.info({ event: "worker.stopped" }, "worker.stopped");
}

function handleShutdown(signal: string) {
  getLogger().info({ event: "worker.shutdown_signal", signal }, "worker.shutdown_signal");
  shuttingDown = true;
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

loop().catch((error) => {
  getLogger().error({ err: error }, "worker.fatal");
  process.exit(1);
});
