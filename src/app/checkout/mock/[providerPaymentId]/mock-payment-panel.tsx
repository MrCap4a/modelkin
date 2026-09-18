"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Dev/E2E-only test harness for the mock payment gateway (ТЗ §24). A real
 * provider integration replaces this entire page — the button here stands
 * in for whatever hosted checkout UI a real provider would render.
 */
export function MockPaymentPanel({ providerPaymentId }: { providerPaymentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function complete(status: "PAID" | "FAILED") {
    setPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/payments/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerPaymentId, status }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? "Не удалось завершить оплату");
      }

      router.push(status === "PAID" ? "/profile" : "/cart");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось завершить оплату");
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={() => complete("PAID")}
        disabled={pending}
        className="rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Обработка…" : "Оплатить"}
      </button>
      <button
        type="button"
        onClick={() => complete("FAILED")}
        disabled={pending}
        className="rounded-control border border-border px-5 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
      >
        Отменить оплату
      </button>
      {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
    </div>
  );
}
