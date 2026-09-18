"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "../_actions";

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

export function AddToCartButton({ modelId, slug }: { modelId: string; slug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction(modelId, slug);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Re-renders the server-side PurchaseCta so it picks up the new
      // "already in cart" state instead of the add-to-cart button.
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CartIcon />
        {isPending ? "Добавляем…" : "Добавить в корзину"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
