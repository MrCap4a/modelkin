import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs on the Edge runtime — intentionally has ZERO dependency on Prisma,
 * the S3 SDK, or `@shared/config`'s Zod parsing (Node-only / not
 * Edge-safe). Reads `process.env` directly instead. Responsible for:
 *  1. request id propagation (ТЗ §41)
 *  2. security headers (ТЗ §43)
 *  3. same-origin CSRF check for state-changing requests (ТЗ §45)
 */

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Paths intentionally exempt from the same-origin check: provider webhooks
// are, by definition, cross-origin server-to-server calls. They must instead
// be protected by payload signature verification in the route handler
// itself (see infrastructure/payments PaymentProvider.verifyWebhook).
const CSRF_EXEMPT_PREFIXES = ["/api/payments/webhook"];

function isRequestIdValid(candidate: string | null): candidate is string {
  return !!candidate && /^[a-zA-Z0-9_-]{8,128}$/.test(candidate);
}

function buildCsp(): string {
  const isProd = process.env.NODE_ENV === "production";
  const s3Host = process.env.S3_PUBLIC_HOST_FOR_CSP;
  const s3Endpoint = process.env.S3_ENDPOINT;

  const connectSrcExtra = [s3Host, s3Endpoint].filter(Boolean).join(" ");
  const imgSrcExtra = [s3Host].filter(Boolean).join(" ");

  const directives = [
    `default-src 'self'`,
    `script-src 'self'${isProd ? "" : " 'unsafe-eval'"}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${imgSrcExtra}`.trim(),
    `font-src 'self' data:`,
    `connect-src 'self' ${connectSrcExtra}`.trim(),
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  // Same-origin requests from fetch/XHR/forms include Origin. Requests
  // without an Origin header (plain top-level navigation, non-browser
  // clients) are not form/XHR submissions in the browser CSRF sense and are
  // left to the route's own auth check.
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    return originUrl.host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest): NextResponse {
  const requestId = isRequestIdValid(request.headers.get("x-request-id"))
    ? request.headers.get("x-request-id")!
    : crypto.randomUUID();

  if (
    STATE_CHANGING_METHODS.has(request.method) &&
    !CSRF_EXEMPT_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix)) &&
    !isSameOrigin(request)
  ) {
    return NextResponse.json(
      { error: { code: "CSRF_REJECTED", message: "Запрос отклонён: недопустимый источник" } },
      { status: 403, headers: { "x-request-id": requestId } },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("x-request-id", requestId);
  response.headers.set("Content-Security-Policy", buildCsp());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets/_next internals, so headers
     * and requestId are applied uniformly across pages and API routes.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
