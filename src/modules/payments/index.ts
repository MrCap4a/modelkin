// Public contract of the payments module. Other modules and app/** should
// only ever import from here, never reach into application/*or
// infrastructure/* directly.

export { processPaymentWebhook } from "./application/process-payment-webhook";
export {
  completeMockPayment,
  completeMockPaymentSchema,
  type CompleteMockPaymentInput,
} from "./application/complete-mock-payment";
export type { PaymentTransitionResult } from "./domain/payment-transition-result";
