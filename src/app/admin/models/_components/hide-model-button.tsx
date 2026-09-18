"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hideModelAction } from "../actions";

export function HideModelButton({ modelId }: { modelId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await hideModelAction(modelId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="rounded-control border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Скрытие…" : "Скрыть"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
