export {
  checkRateLimit,
  enforceRateLimit,
  pruneExpiredRateLimitBuckets,
  type RateLimitOptions,
} from "./rate-limiter";

/** Recommended limits for sensitive endpoints (ТЗ §44). Callers may override per-context. */
export const RATE_LIMIT_PRESETS = {
  login: { limit: 10, windowSeconds: 60 },
  register: { limit: 5, windowSeconds: 60 * 10 },
  passwordReset: { limit: 5, windowSeconds: 60 * 10 },
  fileUpload: { limit: 20, windowSeconds: 60 },
  sensitiveApi: { limit: 30, windowSeconds: 60 },
} as const;
