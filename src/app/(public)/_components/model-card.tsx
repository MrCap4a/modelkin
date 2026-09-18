import Image from "next/image";
import Link from "next/link";
import { formatPriceRub } from "@modules/models";
import type { CatalogModelCard } from "@modules/catalog";

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l1 12a2 2 0 002 2h9a2 2 0 002-2l1-9H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="21" r="1.4" fill="currentColor" />
      <circle cx="18" cy="21" r="1.4" fill="currentColor" />
    </svg>
  );
}

/**
 * Used by both the homepage "Популярно на этой неделе" grid and the /models
 * catalog grid. Fully static/server-rendered on purpose: the "quick add"
 * cart icon navigates to the model page rather than adding directly, so
 * these grids stay plain links with no client JS — the real add-to-cart
 * interaction (guest/owned/in-cart states) lives on the model detail page,
 * which is the only place the task's cross-module cart wiring is scoped to.
 */
export function ModelCard({ model }: { model: CatalogModelCard }) {
  const href = `/models/${model.slug}`;

  return (
    <div className="group overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow hover:shadow-md">
      <Link href={href} className="block" tabIndex={-1}>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-alt">
          {model.imageUrl ? (
            <Image
              src={model.imageUrl}
              alt={model.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-ink-muted">
              Нет фото
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          <span>{model.tag?.name ?? "Модель"}</span>
          <span>.STL</span>
        </div>

        <Link href={href} className="mt-2 block">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink hover:text-primary">
            {model.title}
          </h3>
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-ink">{formatPriceRub(model.price)}</span>
          <Link
            href={href}
            aria-label={`Перейти к модели «${model.title}»`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover"
          >
            <CartIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}
