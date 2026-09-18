import type { Metadata } from "next";
import Link from "next/link";
import { getPasswordResetTokenPreview } from "@modules/auth";
import { AuthCard } from "../../_components/auth-card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Изменение пароля" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getPasswordResetTokenPreview(token);

  if (!preview) {
    return (
      <AuthCard title="Ссылка недействительна">
        <p className="text-center text-sm text-ink-muted">
          Ссылка для восстановления пароля недействительна или истекла. Запросите новую ссылку.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full rounded-control bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Запросить новую ссылку
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Изменение пароля"
      subtitle={
        <>
          Вы меняете пароль от аккаунта{" "}
          <span className="font-medium text-primary">{preview.email}</span>
        </>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
