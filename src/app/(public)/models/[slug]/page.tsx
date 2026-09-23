import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModelBySlug, formatPriceRub } from "@modules/models";
import { getCurrentUser } from "@modules/auth";
import { listRelatedModels } from "@modules/catalog";
import { getConfig } from "@shared/config";
import { toJsonLdScript } from "@shared/utils/json-ld";
import { Breadcrumbs } from "@components/shared/breadcrumbs";
import { ModelCard } from "../../_components/model-card";
import { Gallery } from "./_components/gallery";
import { PurchaseCta } from "./_components/purchase-cta";

interface ModelDetailPageProps {
  params: Promise<{ slug: string }>;
}

function autoDescription(description: string): string {
  return description.length > 200 ? `${description.slice(0, 197)}…` : description;
}

export async function generateMetadata({ params }: ModelDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = await getModelBySlug(slug);
  if (!model) {
    return { title: "Модель не найдена" };
  }

  const appUrl = getConfig().appUrl;
  const canonicalUrl = `${appUrl}/models/${model.slug}`;
  const title = model.seoTitle || `${model.title} — STL-модель для 3D-печати`;
  const description = model.seoDescription || autoDescription(model.description);
  const ogImage = model.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    // Manual per-model opt-out (Model.noindex) — see model-form.tsx in the
    // admin panel. Never inferred automatically; a published model is
    // indexable by default.
    robots: model.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function ModelDetailPage({ params }: ModelDetailPageProps) {
  const { slug } = await params;
  const model = await getModelBySlug(slug);
  if (!model) {
    notFound();
  }

  const [user, relatedModels] = await Promise.all([
    getCurrentUser(),
    listRelatedModels(
      model.id,
      model.tags.map((tag) => tag.slug),
      4,
    ),
  ]);

  const appUrl = getConfig().appUrl;
  const canonicalUrl = `${appUrl}/models/${model.slug}`;
  // Only the first tag decides the breadcrumb trail, matching the single
  // "category" pill design.pdf shows on the model card — a model can carry
  // several tags, but the breadcrumb isn't a full faceted-nav trail.
  const primarySeoTag = model.tags.find((tag) => tag.seoIndexed);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: model.title,
    description: autoDescription(model.description),
    image: model.images.map((image) => image.url),
    sku: model.id,
    brand: { "@type": "Brand", name: "Моделкин" },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "RUB",
      price: (model.price / 100).toFixed(2),
      // Digital download, not a physical stock item — never actually runs out.
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Главная", href: appUrl },
          { name: "Каталог", href: `${appUrl}/models` },
          ...(primarySeoTag
            ? [{ name: primarySeoTag.name, href: `${appUrl}/tag/${primarySeoTag.slug}` }]
            : []),
          { name: model.title },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(productJsonLd) }}
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Gallery
          images={model.images}
          hasViewerModel={model.hasViewerModel}
          slug={model.slug}
          title={model.title}
        />

        <div>
          {model.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {model.tags.map((tag) =>
                tag.seoIndexed ? (
                  <Link
                    key={tag.slug}
                    href={`/tag/${tag.slug}`}
                    className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-muted transition-colors hover:bg-primary hover:text-white"
                  >
                    {tag.name}
                  </Link>
                ) : (
                  <span
                    key={tag.slug}
                    className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {tag.name}
                  </span>
                ),
              )}
            </div>
          )}

          <h1 className="mt-4 text-3xl font-bold text-ink">{model.title}</h1>
          {model.author && (
            <p className="mt-1 text-sm text-ink-muted">Автор: {model.author.name}</p>
          )}

          <div className="mt-6 rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between text-sm text-ink-muted">
              <span>Стоимость STL-файла</span>
              <span className="text-2xl font-bold text-ink">{formatPriceRub(model.price)}</span>
            </div>
            <div className="mt-4">
              <PurchaseCta modelId={model.id} slug={model.slug} user={user} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">Описание модели</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            {model.description}
          </p>
        </section>

        <section className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">Лицензия</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Покупая модель, вы приобретаете право на личное использование файла и печать экземпляров
            для собственных нужд. Перепродажа исходного файла, его публикация на других площадках,
            передача третьим лицам и использование в коммерческих целях без отдельного письменного
            разрешения автора запрещены.
          </p>
        </section>
      </div>

      {relatedModels.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-ink">Похожие модели</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedModels.map((related) => (
              <ModelCard key={related.id} model={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
