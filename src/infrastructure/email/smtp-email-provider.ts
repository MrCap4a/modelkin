import nodemailer from "nodemailer";
import { getConfig } from "@shared/config";
import { ExternalServiceError } from "@shared/errors";
import type { EmailMessage, EmailProvider } from "./email-provider";

/**
 * Real-SMTP hook. Not exercised by default (MAIL_PROVIDER=console) — enable
 * by setting MAIL_PROVIDER=smtp and SMTP_HOST/PORT/USER/PASSWORD, see
 * .env.example and DEPLOYMENT.md.
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: ReturnType<typeof nodemailer.createTransport>;

  constructor() {
    const { smtp } = getConfig().mail;
    if (!smtp.host || !smtp.port) {
      throw new Error("SMTP_HOST/SMTP_PORT must be set when MAIL_PROVIDER=smtp");
    }
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user && smtp.password ? { user: smtp.user, pass: smtp.password } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: getConfig().mail.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      // Email delivery failing must not be reported to the client as a raw
      // SMTP error (could leak infra details) — surface through the shared
      // error hierarchy instead.
      throw new ExternalServiceError("Не удалось отправить письмо", {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
