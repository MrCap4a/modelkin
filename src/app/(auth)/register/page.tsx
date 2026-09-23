import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@modules/auth";
import { AuthCard } from "../_components/auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Регистрация", robots: { index: false, follow: true } };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/profile");

  return (
    <AuthCard title="Создать аккаунт" subtitle="Присоединяйтесь к сообществу печатников Моделкин">
      <RegisterForm />
    </AuthCard>
  );
}
