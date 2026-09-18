import { NextResponse, type NextRequest } from "next/server";
import { getLogger, resolveRequestId, runWithRequestContext } from "@shared/logging";
import { toSafeError } from "@shared/errors";

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (request: NextRequest, context: RouteContext) => Promise<Response> | Response;

/**
 * Wraps an `app/api/**` Route Handler with:
 *  - request-scoped logging context (requestId, ТЗ §41)
 *  - structured start/end HTTP request logs (ТЗ §31)
 *  - centralized, safe error → HTTP response mapping (ТЗ §40)
 *
 * Middleware (src/middleware.ts) already guarantees `x-request-id` is set
 * on every request that reaches a route handler.
 */
export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    const start = Date.now();

    return runWithRequestContext({ requestId }, async () => {
      const logger = getLogger();
      logger.info(
        { event: "http.request", method: request.method, path: request.nextUrl.pathname },
        "http.request",
      );

      try {
        const response = await handler(request, context);
        const headers = new Headers(response.headers);
        headers.set("x-request-id", requestId);
        logger.info(
          {
            event: "http.response",
            status: response.status,
            durationMs: Date.now() - start,
          },
          "http.response",
        );
        return new NextResponse(response.body, { status: response.status, headers });
      } catch (error) {
        const { status, body } = toSafeError(error);
        logger.info(
          { event: "http.response", status, durationMs: Date.now() - start },
          "http.response",
        );
        return NextResponse.json(body, { status, headers: { "x-request-id": requestId } });
      }
    });
  };
}
