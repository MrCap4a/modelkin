import { getMockPaymentProvider } from "./mock-payment-provider";
import type { PaymentProvider } from "./payment-provider";

export type {
  PaymentProvider,
  PaymentProviderStatus,
  CreatePaymentInput,
  CreatePaymentResult,
  WebhookVerificationInput,
  WebhookResult,
} from "./payment-provider";

/**
 * Single seam for swapping in a real provider later: application code
 * should only ever call `getPaymentProvider()`, never import a concrete
 * implementation directly.
 */
export function getPaymentProvider(): PaymentProvider {
  return getMockPaymentProvider();
}
