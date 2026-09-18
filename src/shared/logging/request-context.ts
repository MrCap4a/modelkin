import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface RequestContext {
  requestId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs `fn` with a request-scoped context available to any code on the call
 * stack via `getRequestContext()`, without having to thread requestId/userId
 * through every function signature (ТЗ §41).
 */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/**
 * Accepts a client-supplied correlation id if it looks like a reasonable
 * token, otherwise mints a new one. Prevents unbounded/garbage values from
 * client-controlled headers ending up in logs.
 */
export function resolveRequestId(candidate: string | null | undefined): string {
  if (candidate && /^[a-zA-Z0-9_-]{8,128}$/.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}
