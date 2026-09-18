import Link from "next/link";
import { isModelInCart } from "@modules/cart";
import { isModelOwnedByUser } from "@modules/downloads";
import type { SessionUser } from "@modules/auth";
import { AddToCartButton } from "./add-to-cart-button";

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
 * Decides which of the four CTA states to render (ТЗ §17: "состояние
 * покупки"):
 *  - guest              → link to /login (never a client redirect — a plain
 *                          server-rendered link is simpler and crawlable)
 *  - logged in + owned  → "already purchased" state, links to /profile
 *  - logged in + in cart→ "already in cart" state, links to /cart
 *  - otherwise          → interactive add-to-cart button
 */
export async function PurchaseCta({
  modelId,
  slug,
  user,
}: {
  modelId: string;
  slug: string;
  user: SessionUser | null;
}) {
  if (!user) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(`/models/${slug}`)}`}
        className="flex w-full items-center justify-center gap-2 rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        <CartIcon />
        Добавить в корзину
      </Link>
    );
  }

  const [owned, inCart] = await Promise.all([
    isModelOwnedByUser(user.id, modelId),
    isModelInCart(user.id, modelId),
  ]);

  if (owned) {
    return (
      <Link
        href="/profile"
        className="flex w-full items-center justify-center gap-2 rounded-control bg-success-bg px-5 py-3 text-sm font-semibold text-success"
      >
        Модель уже куплена — перейти к загрузке
      </Link>
    );
  }

  if (inCart) {
    return (
      <Link
        href="/cart"
        className="flex w-full items-center justify-center gap-2 rounded-control border border-primary px-5 py-3 text-sm font-semibold text-primary"
      >
        Уже в корзине — перейти в корзину
      </Link>
    );
  }

  return <AddToCartButton modelId={modelId} slug={slug} />;
}
