import type { Metadata } from "next";
import { getUsersAndPaymentsOverview } from "@modules/admin";
import { PageHeader } from "../_components/page-header";
import { RecentPaymentsList } from "../_components/operations-center-view";

export const metadata: Metadata = { title: "Платежи" };

export default async function AdminPaymentsPage() {
  const overview = await getUsersAndPaymentsOverview();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PageHeader title="Платежи" subtitle="Транзакции продаж STL моделей" />
      <RecentPaymentsList payments={overview.payments} />
    </div>
  );
}
