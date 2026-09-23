import Link from "next/link";
import { toJsonLdScript } from "@shared/utils/json-ld";

export interface BreadcrumbItem {
  name: string;
  /** Absolute URL. Omit on the last item — it's the current page, not a link. */
  href?: string;
}

/**
 * Visible breadcrumb nav + matching BreadcrumbList JSON-LD (SEO audit,
 * 2026-09-21) — used by SEO-significant pages (model detail, /tag/{slug}).
 * `items` must be absolute URLs so the JSON-LD is unambiguous regardless of
 * where the script ends up in the page.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: item.href } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:text-primary hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span className="text-ink">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(jsonLd) }}
      />
    </>
  );
}
