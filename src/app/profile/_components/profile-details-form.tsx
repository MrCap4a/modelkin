"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
// Concrete file, not the `@modules/users` barrel — that barrel also
// re-exports server-only use cases, which breaks in a Client Component.
import { updateProfileSchema } from "@modules/users/domain/update-profile.schema";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import { updateProfileAction } from "../actions";

export function ProfileDetailsForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(false);

    const result = updateProfileSchema.safeParse({ name });
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
      const res = await updateProfileAction(result.data);
      if (!res.ok) {
        setFormError(res.error);
        setFieldErrors(res.fieldErrors);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-card border border-border bg-surface p-6">
      <h2 className="text-lg font-bold text-ink">Личные данные</h2>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          id="name"
          label="Имя"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors.name}
        />
        <FormField id="email" label="Электронная почта" value={email} disabled readOnly />
      </div>

      {formError ? <p className="mt-4 text-sm text-danger">{formError}</p> : null}
      {success ? <p className="mt-4 text-sm text-success">Изменения сохранены</p> : null}

      <SubmitButton pending={pending} className="mt-5">
        Сохранить изменения
      </SubmitButton>
    </form>
  );
}
