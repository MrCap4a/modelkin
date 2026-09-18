"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { requestPasswordResetSchema } from "@modules/auth";
import { FormField } from "../_components/form-field";
import { SubmitButton } from "../_components/submit-button";
import { requestPasswordResetAction } from "./actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = requestPasswordResetSchema.safeParse({ email });
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
      const res = await requestPasswordResetAction(result.data);
      if (!res.ok) {
        setFormError(res.error);
        setFieldErrors(res.fieldErrors);
        return;
      }
      setSubmittedEmail(result.data.email);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {submittedEmail ? (
        <div className="rounded-control border border-success/30 bg-success-bg p-4 text-sm">
          <p className="font-semibold text-success">✓ Ссылка отправлена!</p>
          <p className="mt-1 text-ink-muted">
            Проверьте вашу почту {submittedEmail} в течение нескольких минут.
          </p>
        </div>
      ) : null}

      <FormField
        id="email"
        label="Электронная почта"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
      />
      {formError ? <p className="text-sm text-danger">{formError}</p> : null}
      <SubmitButton pending={pending}>Отправить ссылку</SubmitButton>
      <p className="text-center text-sm text-ink-muted">
        Я вспомнил пароль,{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          вернуться назад
        </Link>
      </p>
    </form>
  );
}
