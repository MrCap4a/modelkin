/**
 * Provider-agnostic payment gateway abstraction (ТЗ §24). The `orders`/
 * `payments` application layer depends only on this interface — never on a
 * concrete SDK — so a real provider (YooKassa, CloudPayments, ...) can be
 * plugged in later purely as a new Infrastructure implementation.
 */

export type PaymentProviderStatus = "PENDING" | "PAID" | "FAILED";

export interface CreatePaymentInput {
  orderId: string;
  /** Amount in minor currency units (kopecks) — never a float. */
  amount: number;
  description: string;
  returnUrl?: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  status: PaymentProviderStatus;
  /** Where to send the buyer to complete payment, if applicable. */
  redirectUrl?: string;
}

export interface WebhookVerificationInput {
  rawBody: string;
  headers: Record<string, string>;
}

export interface WebhookResult {
  providerPaymentId: string;
  status: PaymentProviderStatus;
}

export interface PaymentProvider {
  readonly providerName: string;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  getPaymentStatus(providerPaymentId: string): Promise<PaymentProviderStatus>;

  /** Must return false for any payload that isn't authentically from the provider. */
  verifyWebhook(input: WebhookVerificationInput): boolean;

  handleWebhook(input: WebhookVerificationInput): Promise<WebhookResult>;
}
