"use client";

import { useState } from "react";
import { ChangePasswordForm } from "./change-password-form";

export function ChangePasswordToggle() {
  const [open, setOpen] = useState(false);
  const [justChanged, setJustChanged] = useState(false);

  if (open) {
    return (
      <ChangePasswordForm
        onDone={() => {
          setOpen(false);
          setJustChanged(true);
        }}
      />
    );
  }

  return (
    <div className="mt-2 w-full">
      <button
        type="button"
        onClick={() => {
          setJustChanged(false);
          setOpen(true);
        }}
        className="w-full rounded-control border border-border px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt"
      >
        Изменить пароль
      </button>
      {justChanged ? <p className="mt-2 text-sm text-success">Пароль изменён</p> : null}
    </div>
  );
}
