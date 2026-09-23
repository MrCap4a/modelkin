import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Пользовательское соглашение",
  description: "Условия использования Моделкин.рф.",
  alternates: { canonical: "/terms" },
  // Legal boilerplate — not something worth ranking on, and duplicate
  // across most sites; keep it out of search results (SEO audit, 2026-09-21).
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">Пользовательское соглашение</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Используя сайт Моделкин.рф, вы соглашаетесь с условиями предоставления доступа к цифровым
        3D-моделям, правилами оформления заказов и обработки платежей, действующими на сайте. Полный
        текст соглашения будет опубликован администрацией сервиса.
      </p>
    </div>
  );
}
