import { randomUUID } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentProviderStatus,
  WebhookResult,
  WebhookVerificationInput,
} from "./payment-provider";

/**
 * Test/mock implementation used until a real payment provider is
 * integrated (ТЗ §24 forbids wiring a real provider for now). No external
 * network calls are made: state lives in an in-memory map, which is
 * correct for the single-instance dev/E2E use this exists for — a real
 * provider integration would not have this limitation since the source of
 * truth is the provider's own API, not our process memory.
 *
 * The `/api/payments/mock/complete` route (payments module presentation
 * layer) is the only intended caller of `simulateExternalPayment`; it lets
 * E2E tests and manual QA move a PENDING mock payment to PAID/FAILED and
 * then feeds that exact payload through `handleWebhook`, exercising the
 * real webhook code path end to end.
 */
const MOCK_WEBHOOK_SECRET_HEADER = "x-mock-webhook-secret";
const MOCK_WEBHOOK_SECRET = "mock-webhook-shared-secret";

interface MockPaymentRecord {
  providerPaymentId: string;
  orderId: string;
  amount: number;
  status: PaymentProviderStatus;
}

class MockPaymentProvider implements PaymentProvider {
  readonly providerName = "mock";

  private readonly payments = new Map<string, MockPaymentRecord>();

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerPaymentId = `mock_${randomUUID()}`;
    this.payments.set(providerPaymentId, {
      providerPaymentId,
      orderId: input.orderId,
      amount: input.amount,
      status: "PENDING",
    });

    return {
      providerPaymentId,
      status: "PENDING",
      redirectUrl: `/checkout/mock/${providerPaymentId}`,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentProviderStatus> {
    return this.payments.get(providerPaymentId)?.status ?? "FAILED";
  }

  verifyWebhook(input: WebhookVerificationInput): boolean {
    return input.headers[MOCK_WEBHOOK_SECRET_HEADER] === MOCK_WEBHOOK_SECRET;
  }

  async handleWebhook(input: WebhookVerificationInput): Promise<WebhookResult> {
    const payload = JSON.parse(input.rawBody) as {
      providerPaymentId: string;
      status: PaymentProviderStatus;
    };

    const record = this.payments.get(payload.providerPaymentId);
    if (record) {
      record.status = payload.status;
    }

    return { providerPaymentId: payload.providerPaymentId, status: payload.status };
  }

  /** Dev/E2E-only helper — builds the request the mock webhook endpoint expects. */
  buildWebhookRequest(
    providerPaymentId: string,
    status: PaymentProviderStatus,
  ): { rawBody: string; headers: Record<string, string> } {
    return {
      rawBody: JSON.stringify({ providerPaymentId, status }),
      headers: { [MOCK_WEBHOOK_SECRET_HEADER]: MOCK_WEBHOOK_SECRET },
    };
  }

  getOrderIdForPayment(providerPaymentId: string): string | undefined {
    return this.payments.get(providerPaymentId)?.orderId;
  }
}

let cachedProvider: MockPaymentProvider | undefined;

export function getMockPaymentProvider(): MockPaymentProvider {
  if (!cachedProvider) {
    cachedProvider = new MockPaymentProvider();
  }
  return cachedProvider;
}
