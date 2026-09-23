import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Лицензия STL",
  description: "Условия использования STL-файлов, купленных на Моделкин.рф.",
  alternates: { canonical: "/license" },
  robots: { index: false, follow: true },
};

export default function LicensePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">Лицензия на использование STL-файлов</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Приобретая модель, вы получаете право на личное использование файла и печать экземпляров для
        собственных нужд. Перепродажа исходного файла, его публикация на других площадках, передача
        третьим лицам и использование в коммерческих целях без отдельного письменного разрешения
        автора запрещены.
      </p>
    </div>
  );
}
