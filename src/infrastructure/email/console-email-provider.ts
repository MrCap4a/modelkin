import { getLogger } from "@shared/logging";
import type { EmailMessage, EmailProvider } from "./email-provider";

/**
 * Default dev/local implementation: writes the email into the application
 * log instead of sending it, so flows like password-reset are fully
 * exercisable without real SMTP credentials. Never log the raw HTML body
 * (may contain a one-time reset link) at anything above debug — the subject
 * and recipient are enough for info-level operational visibility.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    getLogger().info(
      { event: "email.sent_console", to: message.to, subject: message.subject },
      "email.sent_console",
    );
    getLogger().debug({ event: "email.body", body: message.text }, "email.body");
  }
}
