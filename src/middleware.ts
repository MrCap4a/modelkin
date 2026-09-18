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

/**
 * `script-src` uses a per-request nonce (+ `strict-dynamic` so scripts
 * Next's own nonce'd bootstrap loads are also trusted, without needing a
 * host allowlist). Next.js auto-detects the nonce for its own inline
 * RSC-hydration scripts (`self.__next_f.push(...)`) by reading it back out
 * of the `Content-Security-Policy` **response** header — that's why
 * `middleware()` below sets this same value on both the forwarded request
 * headers and the response, not just one. Without a nonce (plain
 * `script-src 'self'`), the browser blocks those inline scripts outright
 * and client hydration never runs — found via E2E testing against a real
 * production build; see SECURITY.md.
 */
function buildCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const s3Host = process.env.S3_PUBLIC_HOST_FOR_CSP;
  const s3Endpoint = process.env.S3_ENDPOINT;

  const connectSrcExtra = [s3Host, s3Endpoint].filter(Boolean).join(" ");
  const imgSrcExtra = [s3Host].filter(Boolean).join(" ");

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
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

  // btoa, not Node's Buffer — this file runs on the Edge runtime.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the nonce for its own inline hydration scripts off this
  // *request* header too (not just the response one below) during
  // rendering — see the comment on buildCsp().
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("x-request-id", requestId);
  response.headers.set("Content-Security-Policy", csp);
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
