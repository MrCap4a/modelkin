import type { Metadata } from "next";
import { AuthCard } from "../_components/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Восстановление"
      subtitle="Введите ваш Email, чтобы мы отправили вам ссылку для сброса пароля"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
