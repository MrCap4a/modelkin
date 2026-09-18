import pino from "pino";
import { getConfig } from "@shared/config";
import { DailyRotatingWriter } from "./daily-rotating-writer";
import { getRequestContext } from "./request-context";

/**
 * Field paths pino redacts before a log line is ever serialized. Applies
 * anywhere these keys appear in a logged object, at any depth (ТЗ §31: never
 * log passwords, session/reset tokens, API/payment secrets).
 */
const REDACT_PATHS = [
  "password",
  "passwordHash",
  "*.password",
  "*.passwordHash",
  "token",
  "tokenHash",
  "*.token",
  "*.tokenHash",
  "resetToken",
  "*.resetToken",
  "secret",
  "*.secret",
  "authorization",
  "*.authorization",
  "cookie",
  "*.cookie",
  "req.headers.cookie",
  "req.headers.authorization",
];

let cachedLogger: pino.Logger | undefined;

function buildLogger(): pino.Logger {
  const config = getConfig();

  const appWriter = new DailyRotatingWriter(config.logging.dir, "application");
  const errorWriter = new DailyRotatingWriter(config.logging.dir, "error");

  const streams: pino.StreamEntry[] = [
    { level: config.logging.level as pino.Level, stream: appWriter.asWritable() as never },
    { level: "error", stream: errorWriter.asWritable() as never },
    { level: config.logging.level as pino.Level, stream: process.stdout },
  ];

  return pino(
    {
      level: config.logging.level,
      redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: undefined,
    },
    pino.multistream(streams),
  );
}

function getBaseLogger(): pino.Logger {
  if (!cachedLogger) {
    cachedLogger = buildLogger();
  }
  return cachedLogger;
}

/**
 * Returns a logger bound to the current request's requestId/userId (if any).
 * Prefer this over importing pino directly so every log line is
 * automatically correlated (ТЗ §41).
 */
export function getLogger(bindings?: Record<string, unknown>): pino.Logger {
  const ctx = getRequestContext();
  const merged = {
    ...(ctx?.requestId ? { requestId: ctx.requestId } : {}),
    ...(ctx?.userId ? { userId: ctx.userId } : {}),
    ...bindings,
  };
  return Object.keys(merged).length > 0 ? getBaseLogger().child(merged) : getBaseLogger();
}
