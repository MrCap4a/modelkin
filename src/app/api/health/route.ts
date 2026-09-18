import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@infrastructure/database";
import { withApiHandler } from "@shared/http";

/**
 * ТЗ §42: checks the application itself plus critical dependencies
 * (currently: PostgreSQL). Kept dependency-free of auth so orchestrators
 * (Docker healthcheck, load balancers) can call it unauthenticated.
 */
export const GET = withApiHandler(async () => {
  const databaseHealthy = await checkDatabaseHealth();

  const body = {
    status: databaseHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      database: databaseHealthy ? "ok" : "error",
    },
  };

  return NextResponse.json(body, { status: databaseHealthy ? 200 : 503 });
});
