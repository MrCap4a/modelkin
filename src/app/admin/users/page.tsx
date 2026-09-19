import type { Metadata } from "next";
import { getUsersAndPaymentsOverview } from "@modules/admin";
import { PageHeader } from "../_components/page-header";
import { BuyersTable } from "../_components/operations-center-view";

export const metadata: Metadata = { title: "Пользователи" };

export default async function AdminUsersPage() {
  const overview = await getUsersAndPaymentsOverview();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader title="Пользователи" subtitle="Зарегистрированные покупатели сервиса" />
      <BuyersTable buyers={overview.buyers} />
    </div>
  );
}
