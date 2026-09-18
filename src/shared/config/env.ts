import { z } from "zod";

/**
 * Central environment schema. Validated once at module load (i.e. at
 * process/server start) so a missing/invalid required variable fails fast
 * with a readable error instead of surfacing as a confusing runtime bug
 * later (ТЗ §39).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  APP_URL: z.string().url(),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  S3_PUBLIC_HOST_FOR_CSP: z.string().url().optional(),

  MAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  MAIL_FROM: z.string().email(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  PLATFORM_COMMISSION_BPS: z.coerce.number().int().min(0).max(10000).default(2000),

  LOG_DIR: z.string().default("logs"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    // Intentionally use console here (not the pino logger): this failure
    // happens before the logging subsystem can be trusted to be configured,
    // and the process is about to exit.
    console.error(
      `\nInvalid environment configuration. Fix the following and restart:\n${issues}\n`,
    );

    process.exit(1);
  }

  return parsed.data;
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
