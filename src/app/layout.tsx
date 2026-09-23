import type { Metadata } from "next";
import { toJsonLdScript } from "@shared/utils/json-ld";
import "./globals.css";

// Raw env, not getConfig() — same reasoning as `metadataBase` below: this
// module loads on every page including statically-generated ones, and
// getConfig() runs full Zod validation of the entire env (DB/S3/mail/...),
// not just APP_URL. Keep the root layout's module-load-time surface
// minimal so a missing unrelated env var can't break every single page.
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

// "для домашней и промышленной печати" was deliberately dropped from the
// footer earlier (owner feedback: don't claim what the models are *for* —
// just that they're 3D models) — this description had the same phrase and
// was missed at the time; it's what Google actually shows in the search
// snippet, so it matters here even more than in the footer (SEO audit,
// 2026-09-21).
export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Моделкин — 3D-модели для печати",
    template: "%s — Моделкин",
  },
  description:
    "Маркетплейс проверенных 3D-моделей в формате STL. Каждая модель протестирована реальной печатью перед публикацией.",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Моделкин",
  url: appUrl,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Моделкин",
  url: appUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${appUrl}/models?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLdScript(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLdScript(websiteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
