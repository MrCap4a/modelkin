"use client";

import { useState, useTransition, type FormEvent } from "react";
// Concrete file, not the `@modules/auth` barrel — see the note on the
// other auth forms for why that matters in a Client Component.
import { changePasswordSchema } from "@modules/auth/domain/change-password.schema";
import { FormField } from "./form-field";
import { PasswordRequirementsList } from "./password-requirements-list";
import { SubmitButton } from "./submit-button";
import { changePasswordAction } from "../actions";

export function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      newPasswordConfirm,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const res = await changePasswordAction(result.data);
      if (!res.ok) {
        setFormError(res.error);
        setFieldErrors(res.fieldErrors);
        return;
      }
      onDone();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-4 flex flex-col gap-4 rounded-control border border-border bg-background p-4 text-left"
    >
      <FormField
        id="currentPassword"
        label="Текущий пароль"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        error={fieldErrors.currentPassword}
      />
      <FormField
        id="newPassword"
        label="Новый пароль"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        error={fieldErrors.newPassword}
      />
      <PasswordRequirementsList password={newPassword} />
      <FormField
        id="newPasswordConfirm"
        label="Повторите новый пароль"
        type="password"
        autoComplete="new-password"
        value={newPasswordConfirm}
        onChange={(event) => setNewPasswordConfirm(event.target.value)}
        error={fieldErrors.newPasswordConfirm}
      />

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}

      <div className="flex gap-3">
        <SubmitButton pending={pending}>Сохранить пароль</SubmitButton>
        <button
          type="button"
          onClick={onDone}
          className="rounded-control px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
