import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listCatalog } from "@modules/catalog";
import { getSeoTagPage } from "@modules/tags";
import { getConfig } from "@shared/config";
import { Breadcrumbs } from "@components/shared/breadcrumbs";
import { PaginationNav } from "@components/shared/pagination-nav";
import { ModelCard } from "../../_components/model-card";

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getSeoTagPage(slug);
  if (!tag) {
    return { title: "Категория не найдена" };
  }

  const sp = await searchParams;
  const requestedPage = Number(sp.page);
  const isPaginated = Number.isFinite(requestedPage) && requestedPage > 1;

  const appUrl = getConfig().appUrl;
  const title = tag.seoTitle || `${tag.name} — STL модели`;
  const description =
    tag.seoDescription || `Модели в категории «${tag.name}» — проверенные STL-файлы для 3D-печати.`;
  const canonicalUrl = `${appUrl}/tag/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    // Page 2+ stays crawlable (links to individual models still get
    // followed) but isn't itself a distinct indexable landing page — same
    // "one indexable URL per tag" rule as the base /tag/{slug} decision.
    robots: isPaginated ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonicalUrl, type: "website" },
  };
}

/**
 * Public SEO landing page for one tag (SEO audit, 2026-09-21) — only ever
 * reachable for a tag the admin explicitly opted into indexing
 * (`Tag.seoIndexed`, see ARCHITECTURE.md). This is purely additive: the
 * existing /models?tag=<slug> filter keeps working exactly as before for
 * every tag regardless of this flag, this route just gives a subset of
 * tags a dedicated, indexable page instead of a query-param URL.
 */
export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const tag = await getSeoTagPage(slug);
  if (!tag) {
    notFound();
  }

  const sp = await searchParams;
  const requestedPage = Number(sp.page);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const result = await listCatalog({ tagSlug: slug, page });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const appUrl = getConfig().appUrl;
  const h1 = tag.seoH1 || tag.name;

  function buildHref(targetPage: number): string {
    return targetPage > 1 ? `/tag/${slug}?page=${targetPage}` : `/tag/${slug}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Главная", href: appUrl },
          { name: "Каталог", href: `${appUrl}/models` },
          { name: h1 },
        ]}
      />

      <h1 className="text-3xl font-bold text-ink">{h1}</h1>
      {tag.seoDescription && <p className="mt-2 max-w-2xl text-ink-muted">{tag.seoDescription}</p>}

      {result.items.length === 0 ? (
        <div className="mt-10 rounded-card border border-border bg-surface p-10 text-center text-ink-muted">
          В этой категории пока нет опубликованных моделей.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {result.items.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <PaginationNav page={result.page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
