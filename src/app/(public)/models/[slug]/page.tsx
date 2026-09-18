import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getModelBySlug, formatPriceRub } from "@modules/models";
import { getCurrentUser } from "@modules/auth";
import { getConfig } from "@shared/config";
import { Gallery } from "./_components/gallery";
import { PurchaseCta } from "./_components/purchase-cta";

interface ModelDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ModelDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = await getModelBySlug(slug);
  if (!model) {
    return { title: "Модель не найдена" };
  }

  const appUrl = getConfig().appUrl;
  const canonicalUrl = `${appUrl}/models/${model.slug}`;
  const description =
    model.description.length > 200 ? `${model.description.slice(0, 197)}…` : model.description;
  const ogImage = model.images[0]?.url;

  return {
    title: model.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: model.title,
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

  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
              {model.tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {tag.name}
                </span>
              ))}
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
            Покупая модель, вы приобретаете право на личное использование файла и печать
            экземпляров для собственных нужд. Перепродажа исходного файла, его публикация на
            других площадках, передача третьим лицам и использование в коммерческих целях без
            отдельного письменного разрешения автора запрещены.
          </p>
        </section>
      </div>
    </div>
  );
}
