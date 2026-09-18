import { NextResponse } from "next/server";
import { withApiHandler } from "@shared/http";
import { processPaymentWebhook } from "@modules/payments";

/**
 * Public payment-provider webhook (ТЗ §25). Cross-origin by nature — exempt
 * from the same-origin CSRF check in `src/middleware.ts`
 * (`/api/payments/webhook` prefix) — protected instead by
 * `PaymentProvider.verifyWebhook` signature verification.
 */
export const POST = withApiHandler(async (request) => {
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  await processPaymentWebhook({ rawBody, headers });

  return NextResponse.json({ received: true });
});
