import { getEnv } from "./env";

/**
 * Application-wide configuration derived from validated environment
 * variables. Import `config` (not `getEnv` directly) from application code
 * so derived/defaulted values stay in one place.
 */
export function getConfig() {
  const env = getEnv();

  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    appUrl: env.APP_URL,

    database: {
      url: env.DATABASE_URL,
    },

    storage: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      bucket: env.S3_BUCKET,
      forcePathStyle: env.S3_FORCE_PATH_STYLE ?? false,
      // Falls back to S3_ENDPOINT: most deployments serve public preview/
      // avatar images from the same S3-compatible endpoint the app talks
      // to internally (no separate CDN). Only set S3_PUBLIC_HOST_FOR_CSP
      // explicitly when the public-facing host genuinely differs (e.g. a
      // CDN in front of the bucket).
      publicHostForCsp: env.S3_PUBLIC_HOST_FOR_CSP ?? env.S3_ENDPOINT,
      storagePrefixes: {
        models: "models/",
        avatars: "avatars/",
        customOrders: "custom-orders/",
        previews: "previews/",
      } as const,
    },

    mail: {
      provider: env.MAIL_PROVIDER,
      from: env.MAIL_FROM,
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
      },
    },

    commerce: {
      platformCommissionBps: env.PLATFORM_COMMISSION_BPS,
    },

    logging: {
      dir: env.LOG_DIR,
      level: env.LOG_LEVEL,
    },

    session: {
      cookieName: "modelkin_session",
      durationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  } as const;
}

export type AppConfig = ReturnType<typeof getConfig>;
