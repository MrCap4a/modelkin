import { test, expect } from "@playwright/test";

// Minimal smoke test proving the E2E harness (webServer boot, baseURL,
// migrations/seed having run) works end to end. Feature-specific E2E flows
// (purchase happy path, admin happy path, custom order happy path — ТЗ §49)
// live in their own spec files alongside this one.
test("homepage responds and health check is green", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page).toHaveTitle(/Моделкин/);
});
