import { redirect } from "next/navigation";
import { requireUser } from "@modules/auth";
import { AuthenticationError } from "@shared/errors";
import { MockPaymentPanel } from "./mock-payment-panel";

/**
 * Mock payment gateway redirect target (ТЗ §24) — where
 * `MockPaymentProvider.createPayment` sends the buyer instead of a real
 * hosted checkout page. Purely a test harness; a real provider integration
 * removes this route entirely.
 */
export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ providerPaymentId: string }>;
}) {
  const { providerPaymentId } = await params;

  try {
    await requireUser();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect(`/login?redirect=${encodeURIComponent(`/checkout/mock/${providerPaymentId}`)}`);
    }
    throw error;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-4 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-ink">Тестовая оплата</h1>
      <p className="text-ink-muted">
        Это страница mock-платёжного шлюза — в production её заменит реальный
        платёжный провайдер. Нажмите «Оплатить», чтобы подтвердить оплату заказа.
      </p>
      <MockPaymentPanel providerPaymentId={providerPaymentId} />
    </div>
  );
}
