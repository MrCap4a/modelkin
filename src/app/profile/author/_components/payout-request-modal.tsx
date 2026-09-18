"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPriceRub } from "@modules/models/domain/format-price";
import { requestPayoutAction } from "../actions";

export function PayoutRequestModal({
  availableForPayout,
  minPayoutAmount,
  onClose,
}: {
  availableForPayout: number;
  minPayoutAmount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [bankName, setBankName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [inn, setInn] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit =
    availableForPayout >= minPayoutAmount &&
    bankName.trim() &&
    recipientName.trim() &&
    inn.trim() &&
    accountNumber.trim();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await requestPayoutAction(availableForPayout, {
        bankName: bankName.trim(),
        recipientName: recipientName.trim(),
        inn: inn.trim(),
        accountNumber: accountNumber.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-card">
        <h2 className="text-lg font-bold text-ink">Подтвердить запрос выплаты</h2>
        <p className="mt-2 text-sm text-ink-muted">
          После отправки запроса сумма баланса будет заблокирована до завершения перевода
          финансовым отделом Моделкина.
        </p>

        <div className="mt-5 rounded-control border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Сумма к выплате
          </p>
          <p className="mt-1 text-xl font-bold text-primary">{formatPriceRub(availableForPayout)}</p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Реквизиты получателя
          </p>
          <input
            placeholder="Банк (например, АО «Альфа-Банк»)"
            value={bankName}
            onChange={(event) => setBankName(event.target.value)}
            className="w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            placeholder="Получатель — ФИО"
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            className="w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            placeholder="ИНН"
            value={inn}
            onChange={(event) => setInn(event.target.value)}
            className="w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            placeholder="Номер счёта"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            className="w-full rounded-control border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-control border border-border px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-alt"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!canSubmit || pending}
            onClick={handleConfirm}
            className="flex-1 rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Отправка..." : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}
