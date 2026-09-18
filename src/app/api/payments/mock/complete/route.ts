import { NextResponse } from "next/server";
import { withApiHandler } from "@shared/http";
import { requireUser } from "@modules/auth";
import { completeMockPayment, completeMockPaymentSchema } from "@modules/payments";

/**
 * Dev/E2E-only trigger for the mock payment gateway (ТЗ §24). A real
 * provider would call `/api/payments/webhook` directly instead of this
 * route — this exists purely as a manual/E2E test harness for the mock
 * flow's redirect page (`/checkout/mock/[providerPaymentId]`).
 */
export const POST = withApiHandler(async (request) => {
  const user = await requireUser();
  const body = completeMockPaymentSchema.parse(await request.json());

  await completeMockPayment(user.id, body);

  return NextResponse.json({ status: "ok" });
});
