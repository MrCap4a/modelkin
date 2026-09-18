import { getConfig } from "@shared/config";
import { ConsoleEmailProvider } from "./console-email-provider";
import { SmtpEmailProvider } from "./smtp-email-provider";
import type { EmailProvider } from "./email-provider";

export type { EmailMessage, EmailProvider } from "./email-provider";

let cachedProvider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (!cachedProvider) {
    cachedProvider =
      getConfig().mail.provider === "smtp" ? new SmtpEmailProvider() : new ConsoleEmailProvider();
  }
  return cachedProvider;
}
