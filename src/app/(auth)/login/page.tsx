import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@modules/auth";
import { AuthCard } from "../_components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/profile");

  return (
    <AuthCard title="Рады видеть вас!" subtitle="Войдите в профиль Моделкин">
      <LoginForm />
      <div className="rounded-control border border-border bg-surface-alt p-4 text-sm text-ink-muted">
        Профиль нужен, чтобы сохранить информацию о купленных 3D-моделях и возвращаться к скачиванию
        позже.
      </div>
      <Link
        href="/"
        className="block w-full rounded-control border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary-subtle"
      >
        Продолжить без регистрации
      </Link>
    </AuthCard>
  );
}
