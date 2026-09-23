import type { Metadata } from "next";
import { CustomOrderForm } from "./custom-order-form";

// Title was "Индивидуальный заказ — Моделкин" — the root layout's
// title.template ("%s — Моделкин") already appends the brand suffix to
// every page, so this rendered as a doubled "…— Моделкин — Моделкин"
// (verified live before this fix). Fixed here; see ARCHITECTURE.md for why
// every page's `title` should be the plain, un-suffixed string (SEO audit,
// 2026-09-21).
//
// Canonical is a relative path — root layout.tsx sets `metadataBase`, so
// Next resolves it against the real app origin without this file needing
// its own copy of APP_URL.
export const metadata: Metadata = {
  title: "Индивидуальный заказ",
  description:
    "Не нашли нужную модель? Опишите задачу — профессиональная команда 3D-моделлеров разработает STL файл точно под ваши требования.",
  alternates: { canonical: "/custom-order" },
};

export default function CustomOrderPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">
          Не нашли нужную модель? Создадим её для вас
        </h1>
        <p className="mt-4 text-ink-muted">
          Профессиональная команда 3D-моделлеров разработает STL файл точно под ваши требования
        </p>
      </div>

      <div className="mt-12">
        <CustomOrderForm />
      </div>
    </div>
  );
}
