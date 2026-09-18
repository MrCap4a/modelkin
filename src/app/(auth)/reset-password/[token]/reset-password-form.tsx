"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
// Imported from concrete files, not the `@modules/auth` barrel: that
// barrel also re-exports server-only use cases (`import "server-only"`),
// which breaks when pulled into a Client Component's bundle.
import { confirmPasswordResetSchema } from "@modules/auth/domain/confirm-password-reset.schema";
import { PASSWORD_REQUIREMENTS } from "@modules/auth/domain/password-policy";
import { FormField } from "../../_components/form-field";
import { SubmitButton } from "../../_components/submit-button";
import { confirmPasswordResetAction } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requirementStatus = useMemo(
    () => PASSWORD_REQUIREMENTS.map((requirement) => ({ ...requirement, met: requirement.test(password) })),
    [password],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = confirmPasswordResetSchema.safeParse({ token, password, passwordConfirm });
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
      const res = await confirmPasswordResetAction(result.data);
      if (!res.ok) {
        setFormError(res.error);
        setFieldErrors(res.fieldErrors);
        return;
      }
      router.push("/profile");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FormField
        id="password"
        label="Новый пароль"
        type="password"
        autoComplete="new-password"
        placeholder="Введите новый сложный пароль"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
      />
      <FormField
        id="passwordConfirm"
        label="Повторите новый пароль"
        type="password"
        autoComplete="new-password"
        placeholder="Повторите пароль еще раз"
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        error={fieldErrors.passwordConfirm}
      />

      <div className="rounded-control border border-border bg-surface-alt p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Требования к паролю:
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {requirementStatus.map((requirement) => (
            <li key={requirement.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden className={requirement.met ? "text-success" : "text-ink-muted"}>
                {requirement.met ? "✓" : "○"}
              </span>
              <span className={requirement.met ? "text-ink" : "text-ink-muted"}>{requirement.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}
      <SubmitButton pending={pending}>Сохранить новый пароль</SubmitButton>
    </form>
  );
}
