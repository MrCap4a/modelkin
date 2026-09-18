"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// Imported from the concrete file, not the `@modules/auth` barrel: that
// barrel also re-exports server-only use cases (`import "server-only"`),
// which breaks when pulled into a Client Component's bundle.
import { registerSchema } from "@modules/auth/domain/register.schema";
import { FormField } from "../_components/form-field";
import { SubmitButton } from "../_components/submit-button";
import { registerAction } from "./actions";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = registerSchema.safeParse({ email, password, passwordConfirm });
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
      const res = await registerAction(result.data);
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
        id="email"
        label="Электронная почта"
        type="email"
        autoComplete="email"
        placeholder="alex3dprint"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
      />
      <FormField
        id="password"
        label="Пароль"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
      />
      <FormField
        id="passwordConfirm"
        label="Повторите пароль"
        type="password"
        autoComplete="new-password"
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        error={fieldErrors.passwordConfirm}
      />
      {formError ? <p className="text-sm text-danger">{formError}</p> : null}

      <div className="rounded-control border border-border bg-surface-alt p-4 text-sm">
        <p className="font-semibold text-ink">Зачем нужен профиль?</p>
        <p className="mt-1 text-ink-muted">
          Чтобы сохранить информацию о купленных 3D-моделях и возвращаться к скачиванию позже.
        </p>
      </div>

      <SubmitButton pending={pending}>Зарегистрироваться</SubmitButton>
      <Link
        href="/"
        className="block w-full rounded-control border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary-subtle"
      >
        Продолжить без регистрации
      </Link>
      <p className="text-center text-sm text-ink-muted">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
