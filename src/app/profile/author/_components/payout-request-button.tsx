"use client";

import { useState } from "react";
import { PayoutRequestModal } from "./payout-request-modal";

export function PayoutRequestButton({
  availableForPayout,
  minPayoutAmount,
  disabled,
}: {
  availableForPayout: number;
  minPayoutAmount: number;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Запросить выплату
      </button>
      {open ? (
        <PayoutRequestModal
          availableForPayout={availableForPayout}
          minPayoutAmount={minPayoutAmount}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
