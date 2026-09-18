import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * Admin happy path (ТЗ §49):
 *   Admin login → Create model → Upload files → Publish →
 *   Model appears publicly in /models.
 *
 * Selectors below match `src/app/admin/models/_components/model-form.tsx`,
 * `preview-image-uploader.tsx` and `stl-file-uploader.tsx` as they exist at
 * the time this spec was written (the admin panel, built by a parallel
 * agent, had just landed). If the admin agent's UI changes shape after
 * that, re-check these selectors before trusting a red run.
 */

// Resolved relative to the repo root (Playwright's `testDir`/cwd) — this
// project's Playwright TS transform runs specs as CommonJS, where
// `import.meta` isn't available.
const TEST_IMAGE = path.join(process.cwd(), "tests", "e2e", "fixtures", "test-image.png");
const TEST_STL = path.join(process.cwd(), "tests", "e2e", "fixtures", "test-model.stl");

test("admin creates, uploads files for, and publishes a model, which then appears publicly", async ({
  page,
  request,
}) => {
  const probe = await request.get("/admin/models/new").catch(() => null);
  if (!probe || probe.status() === 404) {
    test.skip(
      true,
      "/admin/models/new does not exist yet (admin module not merged) — re-run this spec once src/app/admin lands.",
    );
    return;
  }

  const uniqueSuffix = Date.now();
  const title = `E2E тестовая модель ${uniqueSuffix}`;

  // --- Admin login ------------------------------------------------------
  await page.goto("/login");
  await page.getByLabel("Электронная почта").fill("admin@modelkin.ru");
  await page.getByLabel("Пароль", { exact: true }).fill("Admin12345!");
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await page.waitForURL(/\/profile|\/admin/);

  // --- Create model ---------------------------------------------------------
  await page.goto("/admin/models/new");
  await expect(page.getByRole("heading", { name: "Добавить 3D-модель" })).toBeVisible();

  await page.getByLabel(/Название модели/).fill(title);
  await page.getByLabel(/Описание параметров/).fill("Модель создана автоматическим E2E-тестом.");
  await page.getByLabel(/Цена/).fill("199");

  // --- Upload preview image ---------------------------------------------
  const imageInput = page.locator('input[type="file"][accept*="image"]');
  await imageInput.setInputFiles(TEST_IMAGE);
  const imageUploadButton = page.getByRole("button", { name: /Загрузить картинку|Заменить картинку/ });
  await expect(imageUploadButton).toBeEnabled({ timeout: 15_000 });

  // --- Upload STL file -----------------------------------------------------
  const stlInput = page.locator('input[type="file"][accept*=".stl"]');
  await stlInput.setInputFiles(TEST_STL);
  await expect(page.getByText("test-model.stl")).toBeVisible({ timeout: 15_000 });

  // --- Publish ---------------------------------------------------------------
  await page.getByRole("button", { name: "Опубликовать" }).click();
  await page.waitForURL("/admin/models");

  // --- Verify the model appears in the public catalog -----------------------
  await page.goto("/models");
  await page.getByPlaceholder(/поиск/i).fill(title);
  await page.keyboard.press("Enter");
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
});
