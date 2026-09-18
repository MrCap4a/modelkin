import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

// API-level test (ТЗ §49: status codes, response contract) for the one
// unauthenticated, dependency-free Route Handler in the app — calls the
// handler function directly with a constructed NextRequest rather than
// booting a real server (see TESTING.md).
const { GET } = await import("@/app/api/health/route");

describe("GET /api/health (API contract)", () => {
  it("returns 200 with an ok status and a database check when the DB is reachable", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();

    const body = (await response.json()) as {
      status: string;
      timestamp: string;
      checks: { database: string };
    };
    expect(body.status).toBe("ok");
    expect(body.checks.database).toBe("ok");
    expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("echoes a valid caller-supplied x-request-id instead of generating a new one", async () => {
    const request = new NextRequest("http://localhost:3000/api/health", {
      headers: { "x-request-id": "caller-supplied-id-123" },
    });
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.headers.get("x-request-id")).toBe("caller-supplied-id-123");
  });
});
