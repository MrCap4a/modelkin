"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CUSTOM_ORDER_STATUSES } from "@modules/custom-orders/domain/custom-order";
import type { CustomOrderStatus } from "@modules/custom-orders/domain/custom-order";
import { STATUS_LABEL } from "../_status";
import { updateCustomOrderStatusAction } from "../actions";

export function CustomOrderStatusPanel({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: CustomOrderStatus;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CustomOrderStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleUpdate() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateCustomOrderStatusAction(orderId, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <label htmlFor="status" className="block text-xs font-medium text-ink-muted">
        Изменить статус
      </label>
      <select
        id="status"
        value={selected}
        onChange={(e) => setSelected(e.target.value as CustomOrderStatus)}
        className="mt-2 w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {CUSTOM_ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={pending || selected === currentStatus}
        onClick={handleUpdate}
        className="mt-3 w-full rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Обновление…" : "Обновить заявку"}
      </button>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {success && !error && <p className="mt-2 text-sm text-success">Статус заявки обновлён</p>}
    </div>
  );
}
