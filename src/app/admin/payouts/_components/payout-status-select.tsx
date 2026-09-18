"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PayoutStatus } from "@modules/authors/domain/author-balance";
import { changePayoutStatusAction } from "../actions";

const STATUSES: PayoutStatus[] = ["REQUESTED", "PROCESSING", "PAID", "REJECTED"];

const STATUS_LABEL: Record<PayoutStatus, string> = {
  REQUESTED: "Запрошена",
  PROCESSING: "В обработке",
  PAID: "Выплачена",
  REJECTED: "Отклонена",
};

export function PayoutStatusSelect({ payoutId, currentStatus }: { payoutId: string; currentStatus: PayoutStatus }) {
  const router = useRouter();
  const [selected, setSelected] = useState<PayoutStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply() {
    setError(null);
    startTransition(async () => {
      const result = await changePayoutStatusAction(payoutId, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as PayoutStatus)}
        className="rounded-control border border-border bg-background px-2.5 py-1.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || selected === currentStatus}
        onClick={apply}
        className="rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "…" : "Применить"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
