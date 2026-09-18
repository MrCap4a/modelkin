import { test, expect } from "@playwright/test";

/**
 * Full buyer happy path (ТЗ §49):
 *   Register → Login (session from registration) → Browse catalog →
 *   Open model → Add to cart → Checkout → Mock payment → Ownership →
 *   Download.
 *
 * Uses a fresh, uniquely-emailed account per run so the test is
 * self-contained and doesn't depend on (or corrupt) seeded demo data.
 * Targets a fixed, stable seed model by slug rather than "the Nth card in
 * the catalog" so catalog ordering/pagination changes don't break this spec.
 */

const MODEL_SLUG = "kronshteyn-dlya-naushnikov";
const MODEL_TITLE = "Кронштейн для наушников";

test("register, buy a model via mock payment, then download the owned STL", async ({ page }) => {
  const uniqueEmail = `e2e-purchase-${Date.now()}@example.com`;
  const password = "Password12345!";

  // --- Register -----------------------------------------------------------
  await page.goto("/register");
  await page.getByLabel("Электронная почта").fill(uniqueEmail);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByLabel("Повторите пароль").fill(password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();

  await page.waitForURL("/profile");

  // --- Browse catalog & open the model page --------------------------------
  await page.goto("/models");
  await expect(page.getByRole("heading", { name: "Магазин 3D-моделей" })).toBeVisible();

  await page.goto(`/models/${MODEL_SLUG}`);
  await expect(page.getByRole("heading", { name: MODEL_TITLE, level: 1 })).toBeVisible();

  // --- Add to cart ----------------------------------------------------------
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  // PurchaseCta re-renders server-side to the "already in cart" link.
  await expect(page.getByRole("link", { name: /Уже в корзине/ })).toBeVisible();

  // --- Cart → checkout --------------------------------------------------
  await page.goto("/cart");
  await expect(page.getByText(MODEL_TITLE)).toBeVisible();
  await page.getByRole("button", { name: "Перейти к оплате" }).click();

  // createOrder redirects to the mock gateway page.
  await page.waitForURL(/\/checkout\/mock\/.+/);
  await expect(page.getByRole("heading", { name: "Тестовая оплата" })).toBeVisible();

  // --- Mock payment ---------------------------------------------------------
  await page.getByRole("button", { name: "Оплатить" }).click();
  await page.waitForURL("/profile");

  // --- Ownership: model now listed under purchases -------------------------
  await page.goto("/profile/purchases");
  await expect(page.getByRole("heading", { name: /Доступно для скачивания \(1\)/ })).toBeVisible();
  await expect(page.getByText(MODEL_TITLE)).toBeVisible();

  // --- Model page now shows the "already purchased" state ------------------
  await page.goto(`/models/${MODEL_SLUG}`);
  await expect(page.getByRole("link", { name: /Модель уже куплена/ })).toBeVisible();

  // --- Download: resolves to a signed MinIO URL -----------------------------
  // Content-Disposition: attachment on the presigned URL (see
  // getSignedDownloadUrl) makes Chromium fire a "download" event instead of
  // navigating, even though the button sets `window.location.href` — but
  // fall back to a plain navigation check in case that ever changes.
  await page.goto("/profile/purchases");
  let capturedDownloadUrl: string | null = null;
  page.once("download", (download) => {
    capturedDownloadUrl = download.url();
  });

  await page.getByRole("button", { name: /Скачать \.STL/ }).click();

  await expect
    .poll(() => capturedDownloadUrl ?? page.url(), { timeout: 15_000 })
    .toContain("localhost:9000");
});
