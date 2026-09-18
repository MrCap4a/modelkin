/**
 * Central place where every module registers its background-job handlers.
 * Feature modules should add a `registerJobHandler("their.job.type", ...)`
 * call inside their own `infrastructure/jobs.ts`, then import + invoke it
 * here — keeps `worker.ts` itself free of per-module knowledge.
 */
export function registerAllJobHandlers(): void {
  // e.g. registerCustomOrderJobHandlers(); registerModelPreviewJobHandlers();
}
