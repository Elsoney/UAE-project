/**
 * Email delivery abstraction. The real provider is an owner decision (TBD);
 * until then the "log" sender records messages instead of sending them.
 * Confirmation emails are queued in public.email_outbox and delivered by a
 * worker using an EmailSender, so a provider outage never loses a confirmation.
 */
import type { Locale } from "@/lib/domain/status";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  locale: Locale;
};

export interface EmailSender {
  readonly name: string;
  send(email: OutgoingEmail): Promise<{ providerMessageId: string }>;
}

/** Development/test sender: keeps messages in memory; never contacts anyone. */
export class LogEmailSender implements EmailSender {
  readonly name = "log";
  readonly sent: OutgoingEmail[] = [];

  constructor(private readonly log: (message: string) => void = () => {}) {}

  async send(email: OutgoingEmail) {
    this.sent.push(email);
    // Never write full email addresses to logs.
    this.log(`[email:log] to=${maskEmail(email.to)} subject=${JSON.stringify(email.subject)}`);
    return { providerMessageId: `log-${this.sent.length}` };
  }
}

/** "sara.ali@example.com" -> "s***@example.com" */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf("@");
  if (at <= 0) return "***";
  return `${address[0]}***${address.slice(at)}`;
}
