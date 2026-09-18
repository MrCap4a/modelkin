"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema } from "@modules/auth";
import { FormField } from "../_components/form-field";
import { SubmitButton } from "../_components/submit-button";
import { loginAction } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
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
      const res = await loginAction(result.data);
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
        placeholder="alex3dprint@mail.ru"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
      />
      <FormField
        id="password"
        label="Пароль"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
        labelRight={
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Забыли пароль?
          </Link>
        }
      />
      {formError ? <p className="text-sm text-danger">{formError}</p> : null}
      <SubmitButton pending={pending}>Войти в аккаунт</SubmitButton>
      <p className="text-center text-sm text-ink-muted">
        Впервые на сайте?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
