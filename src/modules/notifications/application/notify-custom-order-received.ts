import "server-only";
import { getEmailProvider } from "@infrastructure/email";
import { getLogger } from "@shared/logging";
import { extractEmailCandidate } from "../domain/email-detection";

export interface CustomOrderReceivedInput {
  id: string;
  name: string;
  contactValue: string;
  /** The submitter's account email, if they were logged in. */
  userEmail?: string | null;
}

/**
 * Best-effort confirmation email for a newly submitted custom order (ТЗ §9
 * lists `notifications` as its own module, kept separate from
 * @modules/custom-orders so email-sending side effects don't get inlined
 * into the order use case directly).
 *
 * Never throws: a failed send must not fail the order submission it's
 * confirming. Mirrors how @modules/audit's `recordAuditEvent` swallows its
 * own failures — callers can `await` this without a try/catch.
 */
export async function notifyCustomOrderReceived(input: CustomOrderReceivedInput): Promise<void> {
  const email = extractEmailCandidate({
    contactValue: input.contactValue,
    userEmail: input.userEmail,
  });
  if (!email) return;

  try {
    await getEmailProvider().send({
      to: email,
      subject: `Заявка на 3D-моделирование получена — #MD-${input.id.slice(-4).toUpperCase()}`,
      text: [
        `Здравствуйте, ${input.name}!`,
        "",
        "Мы получили вашу заявку на индивидуальное 3D-моделирование.",
        `Номер заявки: #MD-${input.id.slice(-4).toUpperCase()}`,
        "",
        "Наша команда свяжется с вами в ближайшее время, чтобы уточнить детали и стоимость.",
        "",
        "Команда Моделкин.рф",
      ].join("\n"),
    });
  } catch (error) {
    getLogger().error(
      { err: error, customOrderId: input.id },
      "notifications.custom_order_email_failed",
    );
  }
}
